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
        var msg = $(e.currentTarget).val();
        if (e.which == 13) {
            this.parentView.socket.emit('chat_message', {
                message: msg,
                matchId: _this.parentView.matchId,
                playerName: App.helpers.getPlayerName()
            });
        }
    }
});