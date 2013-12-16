var _ = require('underscore');
var Engine = require('./engine').Engine;
var crypto = require('crypto');

function Match(id, db) {
    this.id = id;
    this.black = null;
    this.blackAuthHash = this.createSaltedHash();
    this.blackAuthHashTaken = false;
    this.white = null;
    this.whiteAuthHash = this.createSaltedHash();
    this.whiteAuthHashTaken = false;
    this.lastPlayerAuthHash = null;
    this.spectators = {};
    this.messageLog = [];
    this.engine = new Engine();
    this.db = db;
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
                    this.syncToDB();
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
                this.syncToDB();
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
                    this.syncToDB();
                    return true;
                }   
            }
        }

        else {
            if (this.white == null) {
                player.joinMatch(this, this.whiteAuthHash);
                this.white = player;
                this.whiteAuthHashTaken = true;
                this.syncToDB();
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
            this.syncToDB();
            return 1;
        }
        else if (this.isPlayerWhite(player)) {
            this.white = null;
            this.syncToDB();
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
        this.syncToDB();
        return entry;
    },

    isPlayersTurn: function(player) {
        if (!this.lastPlayerAuthHash) {
            return this.isPlayerBlack(player);
        } else {
            return this.lastPlayerAuthHash != player.matchAuthHash;
        }
    },

    setLastPlayerTurn: function(player) {
        this.lastPlayerAuthHash = player.matchAuthHash;
    },

    placeStone: function(player, coord) {
        var color = this.getPlayerColor(player);
        var result = this.engine.enterMove(color, coord.x, coord.y);
        if (result !== false) {
            this.setLastPlayerTurn(player);
            this.syncToDB();
        }
        return result;
    },

    passTurn: function(player) {
        if (!this.isPlayersTurn(player)) {
            return false;
        }
        this.setLastPlayerTurn(player);
        this.syncToDB();
        return true;
    },

    undoTurn: function(player) {
        if (this.isPlayersTurn(player)) {
            return false;
        }
        this.setLastPlayerTurn(this.getOpponent(player));
        this.engine.undoLastMove();
        this.syncToDB();
    },

    createSaltedHash: function() {
        var salt = crypto.randomBytes(128).toString('base64');
        var textSalt = 'tread.softly.because.you.tread.on.my.dreams';
        var hash = crypto.createHash('md5').update(salt + textSalt).digest('hex');
        return hash.substring(0, 12);
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

    createInDB: function(options) {
        options = _.extend({
            success: function() {},
            error: function() {}
        }, options);

        var collection = this.db.collection('matches');

        collection.insert({
            blackAuthHash: this.blackAuthHash,
            blackAuthHashTaken: this.blackAuthHashTaken,
            whiteAuthHash: this.whiteAuthHash,
            whiteAuthHashTaken: this.whiteAuthHashTaken,
            messageLog: this.messageLog,
            matrix: JSON.stringify(this.engine.matrix),
            moveHistory: this.engine.moveHistory,
            captureCounts: this.engine.captureCounts,
            koCoord: this.engine.koCoord,
            lastPlayerAuthHash: this.lastPlayerAuthHash,
            createdAt: Date.now()
        }, { w: 1 }, function(err, doc) {
            if (err) {
                console.log('DB - Failed to create match');
                console.log(err);
                options.error();
            } else {
                console.log('DB - Match created')
                options.success(_.first(doc));
            }
        });
    },

    syncToDB: function(options) {
        options = _.extend({
            success: function() {},
            error: function() {}
        }, options);

        var collection = this.db.collection('matches');

        collection.findAndModify({ _id: this.id }, null, {
            $set: {
                blackAuthHash: this.blackAuthHash,
                blackAuthHashTaken: this.blackAuthHashTaken,
                whiteAuthHash: this.whiteAuthHash,
                whiteAuthHashTaken: this.whiteAuthHashTaken,
                messageLog: this.messageLog,
                matrix: JSON.stringify(this.engine.matrix),
                moveHistory: this.engine.moveHistory,
                captureCounts: this.engine.captureCounts,
                koCoord: this.engine.koCoord,
                lastPlayerAuthHash: this.lastPlayerAuthHash,
                updatedAt: Date.now()
            }
        }, null, function(err, doc) {
            if (err) {
                console.log('DB failed to sync');
                options.error();
            } else {
                console.log('DB synced')
                options.success(doc);
            }
        });
    },

    // Initialize the match from the db
    syncFromDBDocument: function(doc) {
        this.blackAuthHash = doc.blackAuthHash;
        this.blackAuthHashTaken = doc.blackAuthHashTaken;
        this.whiteAuthHash = doc.whiteAuthHash;
        this.whiteAuthHashTaken = doc.whiteAuthHashTaken;
        this.messageLog = doc.messageLog;
        this.lastPlayerAuthHash = doc.lastPlayerAuthHash;
        this.engine.matrix = JSON.parse(doc.matrix);
        this.engine.moveHistory = doc.moveHistory;
        this.engine.captureCounts = doc.captureCounts;
        this.engine.koCoord = doc.koCoord;
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

    getCaptureCounts: function() {
        return this.engine.captureCounts;
    }
});

exports.Match = Match;
