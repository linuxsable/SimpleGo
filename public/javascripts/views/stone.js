App.Views.Stone = Backbone.View.extend({
    className: 'stone',
    tagName: 'div',

    initialize: function() {
        this.color = this.options.color;
    },

    render: function() {
        if (this.color == 1) {
            this.$el.addClass('black');
        } else {
            this.$el.addClass('white');
        }
        return this;
    },

    destory: function() {
        this.undelegateEvents();
        this.$el.removeData().unbind().remove();
        Backbone.View.prototype.remove.call(this);
    }
});