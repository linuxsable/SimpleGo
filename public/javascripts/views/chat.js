App.Views.Chat = Backbone.View.extend({
    el: '.chat',

    events: {
        
    },

    initialize: function() {
        this.$content = this.$el.find('.content');
    },

    enterMessage: function(text) {
        var msg = $('<div class="message" />');
        msg.html(text);
        this.$content.append(msg);
    }
});