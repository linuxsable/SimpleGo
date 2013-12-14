App.Routers.Main = Backbone.Router.extend({
    routes: {
        '': 'index',
        'm/:id': 'match'
    },

    index: function() {
        var socket = io.connect();

        socket.emit('create_match', function(data) {
            if (data.matchId) {
                this.navigate('/m/' + data.matchId, true);
            } else {
                alert('Something went wrong.');
            }
        }.bind(this));
    },

    match: function(id) {
        window.matchView = new App.Views.Match({
            matchId: id
        });
    }
});