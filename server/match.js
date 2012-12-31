var _ = require('underscore');
var helpers = require('./helpers');
var Engine = require('./engine').Engine;

function Match(id) {
    this.id = id;
    this.black = null;
    this.blackSocketId = null;
    this.white = null;
    this.whiteSocketId = null;
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
        if (this.blackSocketId && this.blackSocketId != player.id) {
            return false;
        }
        player.joinMatch(this);
        this.black = player;    
        this.blackSocketId = player.id;
    },

    joinAsWhite: function(player) {
        // Can't join as white already joined
        if (this.whiteSocketId && this.whiteSocketId != player.id) {
            return false;
        }
        player.joinMatch(this);
        this.white = player;
        this.whiteSocketId = player.id;
    },

    joinAsSpectator: function(player) {
        player.joinMatch(this);
        this.spectators[player.id] = player;    
    },

    needsOpponent: function() {
        return !this.whiteSocketId;
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
    
    wasPlayerBlack: function(player) {
        return this.blackSocketId == player.id;
    },

    wasPlayerWhite: function(player) {
        return this.whiteSocketId == player.id;
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
    }
});

exports.Match = Match;