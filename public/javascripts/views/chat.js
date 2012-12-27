App.Views.Chat = Backbone.View.extend({
    el: '.chat',

    events: {
        'keypress input': 'chatKeypress'
    },

    initialize: function() {
        this.parentView = this.options.parentView;
        this.$content = this.$el.find('.content');
    },

    enterMessage: function(text, name) {
        var msg = $('<div class="message" />');
        if (name) {
            msg.html(name + ': ' + text);    
        } else {
            msg.html(text);
        }
        this.$content.append(msg);
    },

    chatKeypress: function(e) {
        var _this = this;
        if (e.which == 13) {
            var $current = $(e.currentTarget);
            this.parentView.socket.emit('chat_message', {
                message: $current.val(),
                matchId: _this.parentView.matchId,
                playerName: App.helpers.getPlayerName()
            });
            $current.val('');
        }
    }
});