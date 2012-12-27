var _ = require('underscore');

function Match(id) {
    this.id = id;
    this.black = null;
    this.white = null;
    this.spectators = {};
    this.chatMessages = [];
}

Match.prototype.roomId = function() {
    return 'match:' + this.id;
};

Match.prototype.joinAsBlack = function(player) {
    player.joinMatch(this);
    this.black = player;
};

Match.prototype.joinAsWhite = function(player) {
    player.joinMatch(this);
    this.white = player;
};

Match.prototype.joinAsSpectator = function(player) {
    player.joinMatch(this);
    this.spectators[player.id] = player;
};

Match.prototype.needsOpponent = function() {
    return !this.white;
};

Match.prototype.isPlayerInMatch = function(player) {
    return this.isPlayerBlack(player) || this.isPlayerWhite(player) || this.isPlayerASpectator(player);
};

Match.prototype.isPlayerBlack = function(player) {
    return this.black.id == player.id;
};

Match.prototype.isPlayerWhite = function(player) {
    return this.white.id == player.id;
};

Match.prototype.isPlayerASpectator = function(player) {
    var isSpectator = false;
    _.each(this.spectators, function(spectator) {
        if (spectator.id == player.id) {
            isSpectator;
            return false;
        }
    });
    return isSpectator;
};

Match.prototype.removePlayer = function(player) {
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
};

Match.prototype.isEmpty = function() {
    return !this.black && !this.white && _.isEmpty(this.spectators);
};

Match.prototype.enterChatMessage = function(msg) {
    this.chatMessages.push(msg);
};

exports.Match = Match;