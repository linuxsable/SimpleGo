var _ = require('underscore');

function Player(socket, playerName, matchAuthHash) {
    this.socket = socket;
    this.id = socket.id;
    this.matchAuthHash = matchAuthHash;
    this.currentMatchId = null;

    if (playerName) {
        this.name = playerName;
    } else {
        this.name = 'Player';
    }
}

_.extend(Player.prototype, {
    joinMatch: function(match, authHash) {
        this.socket.join(match.roomId());
        this.currentMatchId = match.id;
        this.matchAuthHash = authHash;
    },

    leaveMatch: function(match) {
        this.socket.leave(match.roomId());
        this.currentMatchId = null;
        this.matchAuthHash = null;
        return match.removePlayer(this);    
    }
});

exports.Player = Player;