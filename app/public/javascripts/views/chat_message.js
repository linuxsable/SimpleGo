App.Views.ChatMessage = Backbone.View.extend({
    tagName: 'div',
    className: 'message',

    events: {

    },

    initialize: function() {
        this.parentView = this.options.parentView;
        this.type = this.options.type;
        this.playerName = this.options.playerName;
        this.msg = this.options.msg.linkify(true);

        this.TYPES = {
            CHAT: 1,
            SYSTEM: 2,
            COMMAND: 3
        };
    },

    // Should update to use mustache template
    render: function() {
        if (this.type == this.TYPES.CHAT) {
            if (this.playerName) {
                this.$el.html('<span>' + this.playerName + '</span>: ' + this.msg);
            } else {
                this.$el.html(this.msg);
            }
        }

        else if (this.type == this.TYPES.SYSTEM) {
            this.$el.addClass('system text-muted');
            this.$el.html(this.msg);
        }

        else if (this.type == this.TYPES.COMMAND) {
            this.$el.addClass('command text-primary');
            this.$el.html(this.msg);
        }

        return this;
    }
});
