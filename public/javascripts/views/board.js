App.Views.Board = Backbone.View.extend({
    el: '.board',

    events: {
        'click .matrix .box': 'placeStone' 
    },

    initialize: function() {
        this.parentView = this.options.parentView;
        this.$stoneSound = $('#stone-1')[0];
    },

    placeStone: function(e) {
        var _this = this;
        var $box = $(e.currentTarget);
        var xCoord = $box.data('x');
        var yCoord = $box.data('y');

        // Ask permission if the move is valid
        this.parentView.socket.emit('place_stone', {
            matchId: this.parentView.matchId,
            coord: {
                x: xCoord,
                y: yCoord
            }
        }, function(valid, meta) {
            // These only get run when the server acks it
            if (valid) {
                // Remove captures stones if they exist
                if (!_.isEmpty(meta.captures)) {
                    _this.removeStones(meta.captures);
                }

                // Place the stone on the board
                _this.playStoneSound();
                var stoneView = new App.Views.Stone({ color: meta.color });
                $box.append(stoneView.render().el);    
            } else {
                // Some sort of server error
                console.log('something went wrong from server');
            }
        });
    },

    placeOpponentStone: function(color, coord) {
        var $box = this.$el.find('.matrix .box[data-x="' + coord.x + '"][data-y="' + coord.y + '"]');
        console.log($box);
        var stoneView = new App.Views.Stone({ color: color });
        $box.append(stoneView.render().el);
        this.playStoneSound();
    },

    removeStones: function() {

    },

    playStoneSound: function() {
        this.$stoneSound.load();
        this.$stoneSound.play();
    }
});