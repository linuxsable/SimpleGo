App.Views.Board = Backbone.View.extend({
    el: '.board',

    events: {
        'click .matrix .box': 'placeStone' 
    },

    initialize: function() {
        this.$stoneSound = $('#stone-1')[0]
        this.currentStones = {
            // Example values:
            // '3,12': 'stoneView object'
        };
    },

    placeStone: function(e) {
        if (App.BENCHMARK) {
            console.log('stone placement');
        }

        var $box = $(e.currentTarget);

        if (App.Engine.getMoveCount() % 2 == 1) {
            var color = App.Engine.COLORS.WHITE;   
        } else {
            var color = App.Engine.COLORS.BLACK;
        }

        // Get x and y coords
        var xCoord = $box.data('x');
        var yCoord = $box.data('y');

        result = App.Engine.enterMove(color, xCoord, yCoord)
        if (_.isBoolean(result) && !result) {
            // Spot is already taken, do nothing
            return false;
        } else if (_.isArray(result)) {
            // This is a capture, so we need to remove stones
            this.removeStones(result);
        }

        this.playStoneSound();
        
        // Add to our own history
        var stone = new App.Views.Stone({ color: color });
        this.currentStones[xCoord + ',' + yCoord] = stone;

        // Insert it into the board
        $box.append(stone.render().el);
        this.updateMoveCounter();
        this.updateCaptureCounters();

        if (App.BENCHMARK) {
            console.timeEnd('stone placement');    
        }
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
    },

    updateMoveCounter: function() {
        $('header .moves span.count').html(App.Engine.getMoveCount());
    },

    updateCaptureCounters: function() {
        $('header .captures .white').html(App.Engine.captureCounts[2]);
        $('header .captures .black').html(App.Engine.captureCounts[1]);
    }
});