App.Views.Match = Backbone.View.extend({
    el: 'body',

    events: {
        
    },

    initialize: function() {
        this.matchId = this.options.matchId;
        this.playerColor = null;
        this.isPlayersTurn = false;
        this.boardView = new App.Views.Board({ parentView: this });
        this.chatView = new App.Views.Chat({ parentView: this });
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
            _this.isPlayersTurn = data.isPlayersTurn;

            App.helpers.setAuthHash(_this.matchId, data.matchAuthHash);

            // Fill in the chat messages prior
            _.each(data.messageLog, function(item) {
                _this.chatView.insertMessage(item.type, item.msg, item.playerName);
            });

            // Fill in the game state
            _this.boardView.setupFromServer(data.moveHistory);
        });

        this.socket.on('chat_message', function(data) {
            _this.chatView.insertMessage(data.type, data.msg, data.playerName);
        });

        this.socket.on('placed_stone', function(data) {
            _this.isPlayersTurn = data.isPlayersTurn;
            _this.boardView.placeStoneWithoutEvents(data.color, data.moveCoord);
            if (data.isCapture) {
                _this.boardView.removeStones(data.captures);
            }
        });
    }
});