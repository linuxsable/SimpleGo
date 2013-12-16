var app = require('express')(),
    express = require('express'),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server),
    path = require('path'),
    crypto = require('crypto'),
    _ = require('underscore'),
    Player = require('./player').Player,
    Match = require('./match').Match,
    MongoClient = require('mongodb').MongoClient,
    db = null;

var dbUrl = 'mongodb://admin:iliketurtles@paulo.mongohq.com:10057/hakugo-prod';
MongoClient.connect(dbUrl, function(err, dbase) {
    db = dbase;
    server.listen(process.env.PORT || 5000);
});

app.use(express.static(path.normalize(__dirname + '/../app/public')));
app.get('/*', function(req, res) {
    res.sendfile(path.normalize(__dirname + '/../app/public/index.html'));
});

// Now for socket stuff
var players = {};
var matches = {};

io.set('log level', 2);

io.sockets.on('connection', function(socket) {
    socket.on('create_match', function(ack) {
        console.log('Creating brand new match');

        var match = new Match(null, db);
        match.createInDB({
            success: function(doc) {
                ack({ matchId: doc._id });
            }
        });
    });

    // Join a match room
    socket.on('join_match', function(data) {
        if (!data.id) {
            console.log('error: no id');
            return false;
        }

        // Create player object
        var player = new Player(socket, data.playerName, data.matchAuthHash);
        players[player.id] = player;

        var joinMatch = function(match) {
            var msgEntry;

            // Is it a rejoin because the player got disconnected?
            if (match.doesPlayerHaveBlackAuthHash(player) && match.joinAsBlack(player)) {
                msgEntry = match.blackJoinMessage(player, true);
                console.log('Rejoining as black');
            }
            else if (match.doesPlayerHaveWhiteAuthHash(player) && match.joinAsWhite(player)) {
                msgEntry = match.whiteJoinMessage(player, true);
                console.log('rejoining as white');
            }
            else {
                if (!match.blackAuthHashTaken) {
                    console.log('Match is empty, joining as black');
                    match.joinAsBlack(player);
                    msgEntry = match.blackJoinMessage(player);
                } else {
                    if (match.needsOpponent()) {
                        console.log('Joining as white');
                        match.joinAsWhite(player);
                        msgEntry = match.whiteJoinMessage(player);
                    } else {
                        console.log('Joining as spectator');
                        match.joinAsSpectator(player);
                        msgEntry = match.spectatorJoinMessage(player);
                    }
                }
            }

            match.syncToDB();

            // Let everyone know they have entered the room
            socket.broadcast.to(match.roomId()).emit('chat_message', msgEntry);

            // Update everyones board header
            socket.broadcast.to(match.roomId()).emit('update_board_header', {
                playerList: match.getPlayerList()
            });

            // Update everyone's connected list
            socket.broadcast.to(match.roomId()).emit('update_player_list', {
                playerList: match.getPlayerList()
            });

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
                isSpectator: match.isPlayerASpectator(player),
                playerList: match.getPlayerList()
            });
        };

        // Does the match exist in memory?
        if (_.has(matches, data.id)) {
            joinMatch(matches[data.id]);
        } else {
            var collection = db.collection('matches');
            collection.findOne({
                _id: new require('mongodb').ObjectID(data.id)
            }, {
                blackAuthHash: 1,
                blackAuthHashTaken: 1,
                whiteAuthHash: 1,
                whiteAuthHashTaken: 1,
                messageLog: 1,
                matrix: 1,
                moveHistory: 1,
                captureCounts: 1,
                koCoord: 1,
                lastPlayerAuthHash: 1
            },
            function(err, doc) {
                if (err) return;

                var match = new Match(doc._id, db);
                match.syncFromDBDocument(doc);
                matches[match.id] = match;
                joinMatch(match);
            });
        }
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
            console.log('not players turn');
            return ack(false);
        }

        // Don't allow the game to start without an opponent
        if (match.needsOpponent()) {
            console.log('needs opponent');
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

            io.sockets.in(match.roomId()).emit('update_capture_counts', {
                captureCounts: match.getCaptureCounts()
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

    socket.on('undo_turn', function(data, ack) {
        var player = players[socket.id];

        var match = matches[data.matchId];
        if (!match) {
            console.log('error: match not found');
            return false;
        }

        var opponent = match.getOpponent(player);
        if (!opponent) {
            console.log('error: opponent not found');
            return false;
        }

        // Can't undo if it's not your turn
        if (match.isPlayersTurn(player)) {
            return ack(false);
        }

        console.log("SENDING");

        opponent.socket.emit('undo_turn_confirm');
    });

    socket.on('undo_turn_confirmed', function(data) {
        var player = players[socket.id];

        var match = matches[data.matchId];
        if (!match) {
            console.log('error: match not found');
            return false;
        }

        var opponent = match.getOpponent(player);
        if (!opponent) {
            console.log('error: opponent not found');
            return false;
        }

        if (data.ok) {
            // Update game state
            match.undoTurn(opponent);

            // Event to update client state
            io.sockets.in(match.roomId()).emit('reset_board', {
                matrix: match.engine.matrix,
                lastMovePlayed: _.last(match.engine.moveHistory),
                captureCounts: match.getCaptureCounts()
            });

            socket.broadcast.to(match.roomId()).emit('update_players_turn', {
                isPlayersTurn: true
            });
        } else {

        }
    });

    socket.on('resign', function(data, ack) {

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
                    commandMessage += '<br/>Active Matches: ' + _.size(matches);
                    commandMessage += '<br/>Active Players: ' + _.size(players);
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

        // Update everyone's connected list
        socket.broadcast.to(currentMatch.roomId()).emit('update_player_list', {
            playerList: currentMatch.getPlayerList()
        });

        // Remove the match if no one is in it
        if (currentMatch.isEmpty()) {
            delete matches[currentMatch.id];
        }

        // Remove the player from the players
        delete players[player.id];
    });

    socket.on('update_player_name', function(data) {
        if (!data.name || !data.name.length) {
            console.log('error: missing name parameter');
            return;
        }

        // First get the player
        var player = players[socket.id];
        if (!player) {
            console.log('error: cant find player');
            return false;
        }

        var oldName = player.name;
        player.name = data.name;

        var match = matches[player.currentMatchId];

        // Update everyones board header
        io.sockets.in(match.roomId()).emit('update_board_header', {
            playerList: match.getPlayerList()
        });

        // Update everyone's connected list
        io.sockets.in(match.roomId()).emit('update_player_list', {
            playerList: match.getPlayerList()
        });

        var msgEntry = match.logMessage(
            Match.MESSAGE_TYPE.SYSTEM,
            oldName + ' changed their name to ' + player.name
        );

        io.sockets.in(match.roomId()).emit('chat_message', msgEntry);
    });
});
