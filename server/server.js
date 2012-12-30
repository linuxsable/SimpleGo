var app = require('express')(),
    express = require('express'),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server),
    path = require('path'),
    crypto = require('crypto'),
    _ = require('underscore'),
    Player = require('./player').Player,
    Match = require('./match').Match;

server.listen(3000);

app.use(express.static(path.normalize(__dirname + '/../public')));
app.get('/*', function(req, res) {
    res.sendfile(path.normalize(__dirname + '/../public/index.html'));
});

// Now for socket stuff
var players = {};
var matches = {};

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
                var msgEntry = match.logMessage(
                    Match.MESSAGE_TYPE.SYSTEM,
                    player.name + ' joined as white'
                );
            } else {
                match.joinAsSpectator(player);
                var msgEntry = match.logMessage(
                    Match.MESSAGE_TYPE.SYSTEM,
                    player.name + ' joined as spectator'
                );
            }
        } else {
            // If there's no match, create one    
            var match = new Match(data.id);
            matches[data.id] = match;
            match.joinAsBlack(player);
            var msgEntry = match.logMessage(
                Match.MESSAGE_TYPE.SYSTEM,
                player.name + ' joined as black'
            );
        }

        // Let everyone know they have entered the room
        socket.broadcast.to(match.roomId()).emit('chat_message', msgEntry);

        // Let the client know they've connected,
        // and send along the payload of the current
        // game state to initalize their instance
        socket.emit('joined_match', {
            messageLog: match.messageLog
        });

        console.log('join');
        console.log(matches);
    });

    socket.on('place_stone', function(data, ack) {
        console.log(data);

        var match = matches[data.matchId];
        if (!match) {
            console.log('error: match not found');
            return false;
        }

        // Let's find the current player in the array
        var player = players[socket.id];

        // Don't let the non-players turn go
        if (!match.isPlayersTurn(player)) {
            return ack(false);
        }

        var playerColor = match.getPlayerColor(player);

        // Enter the move, get back the results of that move
        var result = match.placeStone(player, data.coord);

        if (_.isArray(result)) {
            // It's a capture
            ack(true, {
                color: playerColor,
                captures: result
            });
        } else {
            ack(result, { color: playerColor }); 

            // Send the results to the other players
            if (result) {
                socket.broadcast.to(match.roomId()).emit('placed_stone', {
                    isCapture: false,
                    captures: null,
                    moveCoord: data.coord,
                    color: playerColor
                });
            }
        }        
    });

    socket.on('send_chat_message', function(data) {
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

        // Keep a buffer
        var logEntry = match.logMessage(
            Match.MESSAGE_TYPE.CHAT,
            data.message,
            data.playerName
        );

        io.sockets.in(match.roomId()).emit('chat_message', logEntry);
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

        var msgEntry = currentMatch.logMessage(
            Match.MESSAGE_TYPE.SYSTEM,
            player.name + ' left the match'
        );

        socket.broadcast.to(currentMatch.roomId()).emit('chat_message', msgEntry);

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