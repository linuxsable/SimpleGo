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
        var player = new Player(socket, data.playerName, data.matchAuthHash);
        players[player.id] = player;

        var msgEntry;

        // If there's a match, join it
        if (matches.hasOwnProperty(data.id)) {
            var match = matches[data.id];

            // Is it a rejoin because the player got disconnected?
            if (match.doesPlayerHaveBlackAuthHash(player) && match.joinAsBlack(player)) {
                msgEntry = match.blackJoinMessage(player, true);
            }
            else if (match.doesPlayerHaveWhiteAuthHash(player) && match.joinAsWhite(player)) {
                msgEntry = match.whiteJoinMessage(player, true);
            }
            // This isn't a rejoin from a disconnect
            else {
                if (match.needsOpponent()) {
                    match.joinAsWhite(player);
                    msgEntry = match.whiteJoinMessage(player);
                } else {
                    match.joinAsSpectator(player);
                    msgEntry = match.spectatorJoinMessage(player);
                }
            }
        } else {
            // If there's no match, create one    
            var match = new Match(data.id);
            matches[data.id] = match;
            match.joinAsBlack(player);
            msgEntry = match.blackJoinMessage(player);
        }

        // Let everyone know they have entered the room
        socket.broadcast.to(match.roomId()).emit('chat_message', msgEntry);

        // Let the client know they've connected,
        // and send along the payload of the current
        // game state to initalize their instance
        socket.emit('joined_match', {
            messageLog: match.messageLog,
            matrix: match.engine.matrix,
            lastMovePlayed: _.last(match.engine.moveHistory),
            playerColor: match.getPlayerColor(player),
            isPlayersTurn: match.isPlayersTurn(player),
            matchAuthHash: player.matchAuthHash,
            isSpectator: match.isPlayerASpectator(player)
        });

        // console.log(matches);
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

        // Don't allow the game to start without an opponent
        if (match.needsOpponent()) {
            return ack(false);
        }

        // Check the auth hash
        if (!match.isAuthHashValid(player)) {
            console.log('bad auth hash!');
            return ack(false);
        }

        var playerColor = match.getPlayerColor(player);

        // Enter the move, get back the results of that move
        var result = match.placeStone(player, data.coord);

        // It's a capture
        if (_.isArray(result)) {
            ack(true, {
                color: playerColor,
                captures: result
            });

            socket.broadcast.to(match.roomId()).emit('placed_stone', {
                isCapture: true,
                captures: result,
                moveCoord: data.coord,
                color: playerColor,
                isPlayersTurn: !match.isPlayersTurn(player)
            });
        } else {
            ack(result, { color: playerColor }); 

            // Send the results to the other players
            if (result) {
                socket.broadcast.to(match.roomId()).emit('placed_stone', {
                    isCapture: false,
                    captures: null,
                    moveCoord: data.coord,
                    color: playerColor,
                    isPlayersTurn: !match.isPlayersTurn(player)
                });
            }
        }        
    });

    socket.on('pass_turn', function(data, ack) {
        console.log(data);

        var player = players[socket.id];
        var match = matches[data.matchId];

        if (!match) {
            console.log('error: match not found');
            return false;
        }

        if (match.passTurn(player)) {
            ack(true);

            // Event to update client state
            socket.broadcast.to(match.roomId()).emit('passed_turn', {
                isPlayersTurn: match.isPlayersTurn(match.getOpponent(player))
            });

            // Now send a chat message
            var logEntry = match.logMessage(
                Match.MESSAGE_TYPE.SYSTEM,
                player.name + ' passed'
            );

            io.sockets.in(match.roomId()).emit('chat_message', logEntry);
        } else {
            ack(false);
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

        // Check if it's a command, not a message
        if (match.isServerMessage(data.message)) {
            var commandMessage;
            switch (data.message) {
                case '/stats':
                    commandMessage = 'Server stats';
                    commandMessage += '<br/>Matches: ' + _.size(matches);
                    commandMessage += '<br/>Players: ' + _.size(players);
                    break;
                case '/me':
                    break;
                default:
                    commandMessage = 'Help'
                    commandMessage += '<br/>Available commands: /h, /stats';
                    break;
            }

            var entry = match.createMessage(
                Match.MESSAGE_TYPE.COMMAND,
                commandMessage,
                null
            );

            socket.emit('chat_message', entry);
        }

        else {
            // Keep a buffer
            var logEntry = match.logMessage(
                Match.MESSAGE_TYPE.CHAT,
                data.message,
                data.playerName
            );

            io.sockets.in(match.roomId()).emit('chat_message', logEntry);
        }
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
        // if (currentMatch.isEmpty()) {
        //     delete matches[currentMatch.id];
        // }

        // Remove the player from the players
        delete players[player.id];
    });
});
