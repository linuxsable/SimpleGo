function Player(socket) {
    this.socket = socket;
    this.id = socket.id;
    this.name = null;
    this.currentMatchId = null;
}

Player.prototype.joinMatch = function(match) {
    this.socket.join(match.roomId());
    this.currentMatchId = match.id;
};

Player.prototype.leaveMatch = function(match) {
    this.socket.leave(match.roomId());
    this.currentMatchId = null;
    return match.removePlayer(this);
};

exports.Player = Player;