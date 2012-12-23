window.App = {
    Views: {},
    Routers: {},
    Engine: null,
    BENCHMARK: true,

    helpers: {
        randomHash: function() {
            return Math.floor(Math.random() * 0x10000).toString(16);
        }
    },

    init: function() {
        new App.Routers.Main();
        Backbone.history.start({ pushState: true });
    }
};