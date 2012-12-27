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
        window.matchView = new App.Views.Match({
            matchId: id
        });
    }
});