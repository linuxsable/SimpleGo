window.App = {
    Views: {},
    Routers: {},
    Engine: null,
    BENCHMARK: true,

    helpers: {
        randomHash: function() {
            return Math.floor(Math.random() * 0x10000).toString(16);
        },

        showNamePrompt: function() {
            var currentName = localStorage.getItem('config:playerName');
            var name = prompt("What's your name?", currentName);
            localStorage.setItem('config:playerName', name);
        },

        getPlayerName: function() {
            var name = localStorage.getItem('config:playerName');
            if (!name) {
                return 'Player';
            }
            return name;
        }
    },

    init: function() {
        new App.Routers.Main();
        Backbone.history.start({ pushState: true });
    }
};