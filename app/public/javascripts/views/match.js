App.Views.Match = Backbone.View.extend({
    el: 'body',

    events: {
        'click .sidebar .list-group .pass': 'passTurn',
        'click .sidebar .list-group .undo': 'undoTurn',
        'click .sidebar .list-group .resign': 'resign',
        'click .sidebar .list-group .set-name': 'setName'
    },

    socket: null,

    initialize: function() {
        this.matchId = this.options.matchId;
        this.playerColor = null;
        this.isPlayersTurn = false;
        this.isSpectator = false;
        this.boardHeaderView = new App.Views.BoardHeader({ parentView: this });
        this.boardView = new App.Views.Board({ parentView: this });
        this.chatView = new App.Views.Chat({ parentView: this });
        this.defaultTitle = 'SimpleGo - Beautiful Go with a Friend';
        this.setupSockets();
        // this.preventWindowClose();
    },

    setupSockets: function() {
        var _this = this;

        this.socket = io.connect();

        this.socket.emit('join_match', {
            id: this.matchId,
            playerName: App.helpers.getPlayerName(),
            matchAuthHash: App.helpers.getAuthHash(this.matchId)
        });

        // This gets fired once the client has
        // joined the match. used for initalizing
        // game state, etc
        this.socket.on('joined_match', function(data) {
            _this.playerColor = data.playerColor;
            _this.isSpectator = data.isSpectator;
            _this.updatePlayersTurn(data.isPlayersTurn);

            App.helpers.setAuthHash(_this.matchId, data.matchAuthHash);

            // Fill in the chat messages prior
            _.each(data.messageLog, function(item) {
                _this.chatView.insertMessage(item.type, item.msg, item.playerName);
            });

            _this.chatView.renderPlayersFromServer(data.playerList);

            // Fill in the game state
            _this.boardView.renderFromServer(data.matrix, data.lastMovePlayed);

            _this.boardHeaderView.renderFromServer(data.playerList);
        });

        this.socket.on('chat_message', function(data) {
            _this.chatView.insertMessage(data.type, data.msg, data.playerName);
        });

        this.socket.on('placed_stone', function(data) {
            _this.updatePlayersTurn(data.isPlayersTurn);
            _this.boardView.placeStoneWithoutEvents(data.color, data.moveCoord);
            if (data.isCapture) {
                _this.boardView.removeStones(data.captures);
            }
        });

        // The turn has been passed
        this.socket.on('passed_turn', function(data) {
            if (data.isEndGame) {

            } else {
                _this.updatePlayersTurn(data.isPlayersTurn);
            }
        });

        // Ask the player if his opponents undo is ok
        this.socket.on('undo_turn_confirm', function() {
            var result = _this.showUndoConfirmDialog();
            if (result) {
                _this.isPlayersTurn = false;
            }
            _this.socket.emit('undo_turn_confirmed', {
                matchId: _this.matchId,
                ok: result
            });
        });

        // Currently used once an undo is complete
        this.socket.on('reset_board', function(data) {
            _this.boardView.renderFromServer(data.matrix, data.lastMovePlayed);
            _this.boardHeaderView.updateCaptureCounts(data.captureCounts);
        });

        this.socket.on('update_players_turn', function(data) {
            _this.updatePlayersTurn(data.isPlayersTurn);
        });

        this.socket.on('update_board_header', function(data) {
            _this.boardHeaderView.renderFromServer(data.playerList);
        });

        this.socket.on('update_player_list', function(data) {
            _this.chatView.renderPlayersFromServer(data.playerList);
        });

        this.socket.on('update_capture_counts', function(data) {
            _this.boardHeaderView.updateCaptureCounts(data.captureCounts);
        });
    },

    updatePlayersTurn: function(value) {
        this.isPlayersTurn = value;

        if (this.isSpectator) {
            return;
        }

        if (value) {
            document.title = '(Turn) ' + this.defaultTitle;
        } else {
            document.title = this.defaultTitle;
        }
    },

    passTurn: function() {
        var _this = this;

        this.socket.emit('pass_turn', {
            matchId: this.matchId
        }, function(valid) {
            if (valid) {
                // Everythings good, make it not your turn
                _this.updatePlayersTurn(false);
            } else {
                console.error('something went wrong from server');
            }
        });
    },

    undoTurn: function() {
        var _this = this;

        this.socket.emit('undo_turn', {
            matchId: this.matchId
        }, function(valid) {
            if (!valid) {
                console.error('cannot undo when its not your turn');
            }
        });
    },

    resign: function() {

    },

    setName: function() {
        var name = App.helpers.showNamePrompt();

        this.socket.emit('update_player_name', {
            name: name
        });
    },

    showUndoConfirmDialog: function() {
        return confirm('Allow your opponent to undo their turn?');
    },

    preventWindowClose: function() {
        if (this.isSpectator) return;
        $(window).on('beforeunload', function() {
            return "You're about to leave the match.";
        });
    }
});
