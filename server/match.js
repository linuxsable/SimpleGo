var _ = require('underscore');
var Engine = require('./engine').Engine;
var crypto = require('crypto');

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
}

// Class level constants
Match.MESSAGE_TYPE = { CHAT: 1, SYSTEM: 2 };

_.extend(Match.prototype, {
    roomId: function() {
        return 'match:' + this.id;    
    },

    joinAsBlack: function(player) {
        // Attempt a rejoin
        if (this.blackAuthHashTaken) {
            if (player.matchAuthHash == this.blackAuthHash) {
                player.joinMatch(this, this.blackAuthHash);
                this.black = player;
                return true;    
            } else {
                return false;
            }
        }

        // It's a first time black join
        else {
            player.joinMatch(this, this.blackAuthHash);
            this.black = player;
            this.blackAuthHashTaken = true;
            return true;
        }

        return false;
    },

    joinAsWhite: function(player) {
        if (this.whiteAuthHashTaken) {
            if (player.matchAuthHash == this.whiteAuthHash) {
                player.joinMatch(this, this.whiteAuthHash);
                this.white = player;
            } else {
                return false;
            }
        }

        else {
            player.joinMatch(this, this.whiteAuthHash);
            this.white = player;
            this.whiteAuthHashTaken = true;
            return true;
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

    logMessage: function(type, msg, playerName) {
        var entry = {
            type: type,
            msg: msg,
            playerName: playerName,
            timestamp: new Date().getTime()
        };

        this.messageLog.push(entry);

        return entry;
    },

    isPlayersTurn: function(player) {
        // Black starts if game hasn't started
        if (this.lastPlayerTurn == null) {
            return this.isPlayerBlack(player);
        }
        return this.lastPlayerTurn.id != player.id;
    },

    placeStone: function(player, coord) {
        var color = this.getPlayerColor(player);
        var result = this.engine.enterMove(color, coord.x, coord.y);
        if (result !== false) {
            this.lastPlayerTurn = player;
        }
        return result;
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
    }
});

exports.Match = Match;