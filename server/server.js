var app = require('express')(),
    express = require('express'),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server),
    path = require('path'),
    crypto = require('crypto'),
    _ = require('underscore'),
    Player = require('./Player').Player,
    Match = require('./Match').Match;

server.listen(3000);

app.use(express.static(path.normalize(__dirname + '/../public')));
app.get('/*', function(req, res) {
    res.sendfile(path.normalize(__dirname + '/../public/index.html'));
});

// Now for socket stuff
var players = {};
var matches = {};

io.configure(function() {

});

io.sockets.on('connection', function(socket) {
    // Join a match room
    socket.on('join_match', function(data) {
        if (!data.id) {
            console.log('error: no id');
            return false;
        }

        // Create player object
        var player = new Player(socket, data.playerName);
        players[player.id] = player;

        // If there's a match, join it
        if (matches.hasOwnProperty(data.id)) {
            var match = matches[data.id];
            if (match.needsOpponent()) {
                match.joinAsWhite(player);
                io.sockets.in(match.roomId()).emit('match_message', {
                    message: player.name + ' joined as white'
                });
            } else {
                match.joinAsSpectator(player);
                io.sockets.in(match.roomId()).emit('match_message', {
                    message: player.name + ' joined as spectator'
                });
            }
        } else {
            // If there's no match, create one    
            var match = new Match(data.id);
            matches[data.id] = match;
            match.joinAsBlack(player);
            io.sockets.in(match.roomId()).emit('match_message', {
                message: player.name + ' joined as black'
            });
        }

        console.log('join');
        console.log(matches);
    });

    socket.on('chat_message', function(data) {
        if (!data.message) {
            console.log('error: no message');
            return false;
        }

        if (!data.matchId) {
            console.log('error: no match id');
            return false;
        }

        if (!data.playerName) {
            console.log('error: no player name');
            return false;
        }

        var match = matches[data.matchId];

        io.sockets.in(match.roomId()).emit('chat_message_sent', {
            message: data.message,
            playerName: data.playerName
        });
    });

    socket.on('disconnect', function() {
        // First get the player
        var player = players[socket.id];
        if (!player) {
            console.log('error: cant find player');
            return false;
        }

        var currentMatch = matches[player.currentMatchId];

        // Remove the player from the match
        player.leaveMatch(currentMatch);

        io.sockets.in(currentMatch.roomId()).emit('match_message', {
            message: player.name + ' left the match'
        });

        // Remove the match if no one is in it
        if (currentMatch.isEmpty()) {
            delete matches[currentMatch.id];
        }

        // Remove the player from the players
        delete players[player.id];

        console.log(matches);
        console.log(players);
    });
});