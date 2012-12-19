App.Routers.Main = Backbone.Router.extend({
    routes: {
        '': 'index'
    },

    index: function() {
        window.BoardView = new App.Views.Board();
    }
});