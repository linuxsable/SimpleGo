App.Views.Match = Backbone.View.extend({
    el: 'body',

    events: {
        'click .sidebar .links button.pass': 'passTurn',
        'click .sidebar .links button.undo': 'undoTurn',
        'click .sidebar .links button.resign': 'resign'
    },

    socket: null,

    initialize: function() {
        this.matchId = this.options.matchId;
        this.playerColor = null;
        this.isPlayersTurn = false;
        this.isSpectator = false;
        this.boardView = new App.Views.Board({ parentView: this });
        this.chatView = new App.Views.Chat({ parentView: this });
        this.defaultTitle = 'HakuGo: Beautiful Go with a Friend';
        this.setupSockets();
        // this.preventWindowClose();
    },

    setupSockets: function() {
        var _this = this;
        
        this.socket = io.connect();
        
        this.socket.emit('join_match', {
            id: _this.matchId,
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

            // Fill in the game state
            _this.boardView.renderFromServer(data.matrix, data.lastMovePlayed);
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
        });

        this.socket.on('update_players_turn', function(data) {
            _this.updatePlayersTurn(data.isPlayersTurn);
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

    showUndoConfirmDialog: function() {
        return confirm('Allow your opponent to undo their turn?');
    },

    preventWindowClose: function() {
        if (this.isSpectator) return;
        $(window).on('beforeunload', function() {
            return 'Are you sure you wish to leave the match?';
        });
    }
});