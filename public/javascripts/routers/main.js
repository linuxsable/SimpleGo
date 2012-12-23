App.Routers.Main = Backbone.Router.extend({
    routes: {
        '': 'index',
        'm/:id': 'match'
    },

    index: function() {
        var hash = App.helpers.randomHash() + App.helpers.randomHash();
        return this.navigate('/m/' + hash, true);
    },

    match: function(id) {
        window.boardView = new App.Views.Board({
            id: id
        });

        window.chatView = new App.Views.Chat({
            id: id
        });
    }
});