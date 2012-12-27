function Player(socket, playerName) {
    this.socket = socket;
    this.id = socket.id;
    this.currentMatchId = null;

    if (playerName) {
        this.name = playerName;
    } else {
        this.name = 'Player';
    }
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