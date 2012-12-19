App.Views.Stone = Backbone.View.extend({
    className: 'stone',
    tagName: 'div',

    initialize: function() {
        this.color = this.options.color;
    },

    render: function() {
        if (this.color == App.Engine.COLORS.WHITE) {
            this.$el.addClass('white');
        } else {
            this.$el.addClass('black');
        }
        return this;
    },

    destory: function() {
        this.undelegateEvents();
        this.$el.removeData().unbind().remove();
        Backbone.View.prototype.remove.call(this);
    }
});