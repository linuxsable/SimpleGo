App.Views.Stone = Backbone.View.extend({
    className: 'stone',
    tagName: 'div',

    initialize: function() {
        this.color = this.options.color;
        this.ghost = this.options.ghost;
        this.showHistoryMarker = this.options.showHistoryMarker;
    },

    render: function() {
        if (this.color == 1) {
            this.$el.addClass('black');
        } else {
            this.$el.addClass('white');
        }

        if (this.ghost) {
            this.$el.addClass('ghost');
        }

        if (this.showHistoryMarker) {
            this.insertHistoryMarker();
        }

        return this;
    },

    insertHistoryMarker: function() {
        this.$el.html( $('<div class="marker">') );
    },

    removeHistoryMarker: function() {
        this.$el.html('');
    },

    destory: function() {
        this.undelegateEvents();
        this.$el.removeData().unbind().remove();
        Backbone.View.prototype.remove.call(this);
    }
});