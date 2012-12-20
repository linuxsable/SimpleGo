var app = require('express')(),
    express = require('express'),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server),
    path = require('path'),
    _ = require('underscore'),
    Player = require('./Player').Player;

server.listen(3000);

app.use(express.static(path.normalize(__dirname + '/../public')));
app.get('/', function (req, res) {
    res.sendfile(path.normalize(__dirname + '/../public/index.html'));
});

// Now for socket stuff

var players = [];
var matches = [];

io.configure(function() {

});

io.sockets.on('connection', function(socket) {
    // Create a new player
    players.push(new Player(socket.id));

    // Tell everyone the player has connected
    io.sockets.emit('player conencted', socket.id);

    // Handle the player disconnecting
    socket.on('disconnect', function() {
        var removePlayer = _.find(players, function(p) {
            return p.id == socket.id;
        });

        players.splice(players.indexOf(removePlayer), 1);

        io.sockets.emit('player disconnect', socket.id);
    });
});