var _ = require('underscore');
var Engine = require('./engine').Engine;
var crypto = require('crypto');
var mysql = require('mysql');

function Match(id) {
    this.id = id;
    this.black = null;
    this.blackAuthHash = this.createSaltedHash();
    this.blackAuthHashTaken = false;
    this.white = null;
    this.whiteAuthHash = this.createSaltedHash();
    this.whiteAuthHashTaken = false;
    this.lastPlayerTurn = null;
    this.spectators = {};
    this.messageLog = [];
    this.engine = new Engine();

    // this.dbConnection = mysql.createConnection({
    //     host: 'localhost',
    //     user: '',
    //     password: ''
    // });

    // this.dbConnection.connect();
}

// Class level constants
Match.MESSAGE_TYPE = { CHAT: 1, SYSTEM: 2, COMMAND: 3 };

_.extend(Match.prototype, {
    roomId: function() {
        return 'match:' + this.id;    
    },

    joinAsBlack: function(player) {
        // Attempt a rejoin
        if (this.blackAuthHashTaken) {
            if (player.matchAuthHash == this.blackAuthHash) {
                if (this.black == null) {
                    player.joinMatch(this, this.blackAuthHash);
                    this.black = player;    
                    return true;
                }
            }
        }

        // It's a first time black join
        else {
            if (this.black == null) {
                player.joinMatch(this, this.blackAuthHash);
                this.black = player;
                this.blackAuthHashTaken = true;
                return true;
            }
        }

        return false;
    },

    joinAsWhite: function(player) {
        if (this.whiteAuthHashTaken) {
            if (player.matchAuthHash == this.whiteAuthHash) {
                if (this.white == null) {
                    player.joinMatch(this, this.whiteAuthHash);
                    this.white = player;    
                    return true;
                }   
            }
        }

        else {
            if (this.white == null) {
                player.joinMatch(this, this.whiteAuthHash);
                this.white = player;
                this.whiteAuthHashTaken = true;
                return true;    
            }
        }

        return false;
    },

    joinAsSpectator: function(player) {
        player.joinMatch(this, null);
        this.spectators[player.id] = player;    
    },

    needsOpponent: function() {
        return !this.whiteAuthHashTaken;
    },

    isPlayerInMatch: function(player) {
        return this.isPlayerBlack(player) || this.isPlayerWhite(player) || this.isPlayerASpectator(player);    
    },

    isPlayerBlack: function(player) {
        if (this.black) {
            return this.black.id == player.id;
        }
        return false;
    },

    isPlayerWhite: function(player) {
        if (this.white) {
            return this.white.id == player.id;        
        }
        return false;
    },

    getPlayerColor: function(player) {
        if (this.isPlayerBlack(player)) {
            return this.engine.COLORS.BLACK;
        } else {
            return this.engine.COLORS.WHITE;
        }
    },

    isPlayerASpectator: function(player) {
        var isSpectator = false;
        _.each(this.spectators, function(spectator) {
            if (spectator.id == player.id) {
                isSpectator = true;
                return false;
            }
        });
        return isSpectator;
    },

    getOpponent: function(player) {
        if (this.black == player) {
            return this.white;
        } 
        else if (this.white == player) {
            return this.black;
        }
        else {
            return null;
        }
    },

    removePlayer: function(player) {
        if (this.isPlayerBlack(player)) {
            this.black = null;
            return 1;
        }
        else if (this.isPlayerWhite(player)) {
            this.white = null;
            return 2;
        }
        else if (this.isPlayerASpectator(player)) {
            delete this.spectators[player.id];
            return 3;
        }
    },

    isEmpty: function() {
        return !this.black && !this.white && _.isEmpty(this.spectators);
    },

    createMessage: function(type, msg, playerName) {
        return {
            type: type,
            msg: msg,
            playerName: playerName,
            timestamp: new Date().getTime()
        };
    },

    logMessage: function(type, msg, playerName) {
        var entry = this.createMessage(type, msg, playerName);
        this.messageLog.push(entry);
        return entry;
    },

    isPlayersTurn: function(player) {
        // Black starts if game hasn't started
        if (!this.lastPlayerTurn) {
            return this.isPlayerBlack(player);
        }

        // Handles a bug with rejoining. Reset the matchAuthHash
        // to the last rejoined played.
        // if (this.lastPlayerTurn.matchAuthHash == null) {
        //     console.log('running');
        //     this.setLastPlayerTurn(player);
        // }
        
        return this.lastPlayerTurn.matchAuthHash != player.matchAuthHash;
    },

    placeStone: function(player, coord) {
        var color = this.getPlayerColor(player);
        var result = this.engine.enterMove(color, coord.x, coord.y);
        if (result !== false) {
            this.setLastPlayerTurn(player);
        }
        return result;
    },

    passTurn: function(player) {
        if (!this.isPlayersTurn(player)) {
            return false;
        }
        this.setLastPlayerTurn(player);
        return true;
    },

    undoTurn: function(player) {
        if (this.isPlayersTurn(player)) {
            return false;
        }
        this.setLastPlayerTurn(this.getOpponent(player));
        this.engine.undoLastMove();
    },

    createSaltedHash: function() {
        var salt = crypto.randomBytes(128).toString('base64');
        var textSalt = 'tread.softly.because.you.tread.on.my.dreams';
        return crypto.createHash('md5').update(salt + textSalt).digest('hex');
    },

    whiteJoinMessage: function(player, rejoin) {
        var joinMsg = rejoin ? 'rejoined' : 'joined';
        return this.logMessage(
            Match.MESSAGE_TYPE.SYSTEM,
            player.name + ' ' + joinMsg + ' as white'
        );
    },

    blackJoinMessage: function(player, rejoin) {
        var joinMsg = rejoin ? 'rejoined' : 'joined';
        return this.logMessage(
            Match.MESSAGE_TYPE.SYSTEM,
            player.name + ' ' + joinMsg + ' as black'
        );
    },

    spectatorJoinMessage: function(player, rejoin) {
        var joinMsg = rejoin ? 'rejoined' : 'joined';
        return this.logMessage(
            Match.MESSAGE_TYPE.SYSTEM,
            player.name + ' ' + joinMsg + ' as spectator'
        );
    },

    isAuthHashValid: function(player) {
        if (this.isPlayerBlack(player)) {
            return this.blackAuthHash == player.matchAuthHash;
        }
        else if (this.isPlayerWhite(player)) {
            return this.whiteAuthHash == player.matchAuthHash;
        }
        return null;
    },

    doesPlayerHaveBlackAuthHash: function(player) {
        return player.matchAuthHash == this.blackAuthHash;
    },

    doesPlayerHaveWhiteAuthHash: function(player) {
        return player.matchAuthHash == this.whiteAuthHash;
    },

    isServerMessage: function(message) {
        return message && message[0] == '/';
    },

    syncToDB: function() {
        console.log(this.dbConnection);
    },

    getPlayerList: function() {
        var players = [];
        var output = [];
        var blackName = null;
        var whiteName = null;

        _.each(this.spectators, function(player) {
            players.push(player);
        });

        if (this.black) {
            players.push(this.black);
            blackName = this.black.name;
        }

        if (this.white) {
            players.push(this.white);
            whiteName = this.white.name;
        }

        _.each(players, function(player) {
            output.push(player.name);
        });

        return {
            players: {
                black: blackName,
                white: whiteName
            },
            everyone: output
        };
    },

    setLastPlayerTurn: function(value) {
        console.log('setting last player turn');
        this.lastPlayerTurn = value;
    }
});

exports.Match = Match;