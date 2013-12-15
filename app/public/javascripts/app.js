window.App = {
    Views: {},
    Routers: {},
    BENCHMARK: true,

    helpers: {
        randomHash: function() {
            return Math.floor(Math.random() * 0x10000).toString(16);
        },

        showNamePrompt: function() {
            var currentName = localStorage.getItem('config:player_name');
            var name = prompt("What's your name?", currentName);
            localStorage.setItem('config:player_name', name.truncate(12));
            return name;
        },

        getPlayerName: function() {
            var name = localStorage.getItem('config:player_name');
            if (name == null || name == undefined) {
                return 'Player';
            }
            return name;
        },

        getAuthHash: function(matchId) {
            return localStorage.getItem('match:' + matchId + ':auth_hash');
        },

        setAuthHash: function(matchId, value) {
            return localStorage.setItem('match:' + matchId + ':auth_hash', value);
        }
    },

    init: function() {        
        new App.Routers.Main();
        Backbone.history.start({ pushState: true });
    }
};

// Monkeypatching
String.prototype.linkify = function(newWindow) {
    newWindow = newWindow || false;

    // http://, https://, ftp://
    var urlPattern = /\b(?:https?|ftp):\/\/[a-z0-9-+&@#\/%?=~_|!:,.;]*[a-z0-9-+&@#\/%=~_|]/gim;

    // www. sans http:// or https://
    var pseudoUrlPattern = /(^|[^\/])(www\.[\S]+(\b|$))/gim;

    if (newWindow) {
        return this
            .replace(urlPattern, '<a href="$&" target="_blank">$&</a>')
            .replace(pseudoUrlPattern, '$1<a href="http://$2" target="_blank">$2</a>');
    } else {
        return this
            .replace(urlPattern, '<a href="$&">$&</a>')
            .replace(pseudoUrlPattern, '$1<a href="http://$2">$2</a>');
    }
};

String.prototype.truncate = function(length) {
    if (this == null) return '';
    length = ~~length;
    return this.length > length ? this.slice(0, length) : this.toString();
};
