window.App = {
    Views: {},
    Routers: {},
    Engine: null,
    BENCHMARK: true,

    init: function() {
        new App.Routers.Main();
        Backbone.history.start();
    }
};