App.Views.Match = Backbone.View.extend({
    el: 'body',

    events: {
        'click .sidebar .links button.pass': 'passTurn'
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
            _this.boardView.setupFromServer(data.matrix, data.lastMovePlayed);
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

        this.socket.on('passed_turn', function(data) {
            if (data.isEndGame) {

            } else {
                _this.updatePlayersTurn(data.isPlayersTurn);
            }
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
    }
});