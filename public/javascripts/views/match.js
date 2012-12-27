App.Views.Match = Backbone.View.extend({
    el: 'body',

    events: {
        
    },

    initialize: function() {
        this.matchId = this.options.matchId;
        this.boardView = new App.Views.Board({ parentView: this });
        this.chatView = new App.Views.Chat({ parentView: this });
        this.setupSockets();
    },

    setupSockets: function() {
        var _this = this;
        
        this.socket = io.connect();
        
        this.socket.emit('join_match', {
            id: _this.matchId,
            playerName: App.helpers.getPlayerName()
        });

        this.socket.on('match_message', function(data) {
            _this.chatView.enterMessage(data.message);
        });

        this.socket.on('chat_message_sent', function(data) {
            _this.chatView.enterMessage(data.message, data.playerName);
        });
    }
});