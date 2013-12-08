App.Routers.Main = Backbone.Router.extend({
    routes: {
        '': 'index',
        'm/:id': 'match'
    },

    index: function() {
        var Match = Parse.Object.extend('match');
        var match = new Match();

        // Make it only readable to other users
        // var acl = new Parse.ACL(Parse.User.current());
        // acl.setPublicReadAccess(true);
        // match.setACL(acl);

        match.save({
            success: function() {
                this.navigate('/m/' + match.id, true);
            }.bind(this),

            error: function() {

            }
        });
    },

    match: function(id) {
        var match = Parse.Object.extend('match');
        var matchQuery = new Parse.Query(match);

        matchQuery.get(id, {
            success: function() {
                window.matchView = new App.Views.Match({
                    matchId: id
                });
            },

            error: function() {
                console.log('error loading match');
            }
        })
    }
});