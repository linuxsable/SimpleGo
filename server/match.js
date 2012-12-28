var _ = require('underscore');
var Engine = require('./engine').Engine;

function Match(id) {
    this.id = id;
    this.black = null;
    this.white = null;
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
        player.joinMatch(this);
        this.black = player;    
    },

    joinAsWhite: function(player) {
        player.joinMatch(this);
        this.white = player;
    },

    joinAsSpectator: function(player) {
        player.joinMatch(this);
        this.spectators[player.id] = player;    
    },

    needsOpponent: function() {
        return !this.white;    
    },

    isPlayerInMatch: function(player) {
        return this.isPlayerBlack(player) || this.isPlayerWhite(player) || this.isPlayerASpectator(player);    
    },

    isPlayerBlack: function(player) {
        return this.black.id == player.id;    
    },

    isPlayerWhite: function(player) {
        return this.white.id == player.id;    
    },

    isPlayerASpectator: function(player) {
        var isSpectator = false;
        _.each(this.spectators, function(spectator) {
            if (spectator.id == player.id) {
                isSpectator;
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
    }
});

exports.Match = Match;