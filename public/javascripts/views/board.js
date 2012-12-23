App.Views.Board = Backbone.View.extend({
    el: '.board',

    events: {
        'click .matrix .box': 'placeStone' 
    },

    initialize: function() {
        this.matchId = this.options.id;
        this.$stoneSound = $('#stone-1')[0];
        this.setupSockets();
    },

    setupSockets: function() {
        var _this = this;
        this.socket = io.connect('http://localhost:3000');
        this.socket.emit('join_match', {
            id: _this.matchId
        });
        this.socket.on('match_message', function(data) {
            window.chatView.enterMessage(data.message);
        });
    },

    placeStone: function() {

    },

    playStoneSound: function() {
        this.$stoneSound.load();
        this.$stoneSound.play();
    }
});