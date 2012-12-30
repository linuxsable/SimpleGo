App.Views.Chat = Backbone.View.extend({
    el: '.chat',

    events: {
        'keypress input': 'chatKeypress'
    },

    initialize: function() {
        this.parentView = this.options.parentView;
        this.$content = this.$el.find('.content');
    },

    // Needs to be converted to using templates
    insertMessage: function(type, msg, playerName) {
        var msg = new App.Views.ChatMessage({
            parentView: this,
            type: type,
            msg: msg,
            playerName: playerName
        });

        this.$content.append(msg.render().el);
    },

    chatKeypress: function(e) {
        var _this = this;
        if (e.which == 13) {
            var $current = $(e.currentTarget);
            this.parentView.socket.emit('send_chat_message', {
                message: $current.val(),
                matchId: _this.parentView.matchId,
                playerName: App.helpers.getPlayerName()
            });
            $current.val('');
        }
    }
});