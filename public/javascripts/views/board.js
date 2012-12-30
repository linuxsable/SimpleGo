App.Views.Board = Backbone.View.extend({
    el: '.board',

    events: {
        'click .matrix .box': 'placeStone' 
    },

    initialize: function() {
        this.parentView = this.options.parentView;
        this.$stoneSound = $('#stone-1')[0];
        this.currentStones = {
            // Example values:
            // '3,12': 'stoneView object'
        };
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
                _this.currentStones[xCoord + ',' + yCoord] = stoneView;
            } else {
                // Some sort of server error
                console.log('something went wrong from server');
            }
        });
    },

    placeOpponentStone: function(color, coord) {
        var $box = this.$el.find('.matrix .box[data-x="' + coord.x + '"][data-y="' + coord.y + '"]');
        var stoneView = new App.Views.Stone({ color: color });
        $box.append(stoneView.render().el);
        this.currentStones[coord.x + ',' + coord.y] = stoneView;
        this.playStoneSound();
    },

    removeStones: function(coordList) {
        var _this = this;
        _.each(coordList, function(coord) {
            var key = coord.join(',');
            if (_this.currentStones.hasOwnProperty(key)) {
                _this.currentStones[key].destory();
            }
            delete _this.currentStones[key];
        });
    },

    removeAllStones: function() {
        _.each(this.currentStones, function(stone, key) {
            stone.destory();
        });
        this.currentStones = {};
        return true;
    },

    playStoneSound: function() {
        this.$stoneSound.load();
        this.$stoneSound.play();
    }
});