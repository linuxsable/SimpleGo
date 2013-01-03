App.Views.Board = Backbone.View.extend({
    el: '.board',

    events: {
        'click .matrix table td': 'placeStone',
        'mouseenter .matrix table td': 'showGhostStone',
        'mouseleave .matrix table td': 'hideGhostStone'
    },

    initialize: function() {
        this.parentView = this.options.parentView;
        this.$stoneSound = $('#stone-1')[0];
        this.$stoneSoundOpponent = $('#stone-2')[0];
        this.currentStones = {
            // Example values:
            // '3,12': 'stoneView object'
        };
    },

    setupFromServer: function(moveHistory) {
        var _this = this;
        _.each(moveHistory, function(move) {
            _this.placeStoneWithoutEvents(move.color, { x: move.x, y: move.y }, false);
        });
    },

    placeStone: function(e) {
        // Don't do anything if not turn
        if (!this.parentView.isPlayersTurn) {
            return;
        }

        var _this = this;
        var $box = $(e.currentTarget);
        var xCoord = $box.data('x');
        var yCoord = $box.data('y');

        // Ask permission if the move is valid
        this.parentView.socket.emit('place_stone', {
            matchId: this.parentView.matchId,
            authHash: App.helpers.getAuthHash(this.parentView.matchId),
            coord: {
                x: xCoord,
                y: yCoord
            }
        }, function(valid, meta) {
            // These only get run when the server acks it
            if (valid) {
                _this.parentView.isPlayersTurn = false;

                // Remove the ghost stone
                $box.find('.stone.ghost').remove();

                // Remove captures stones if they exist
                if (!_.isEmpty(meta.captures)) {
                    _this.removeStones(meta.captures);
                }

                // Remove last marker
                _this.removeLastMarker();

                // Place the stone on the board
                var stoneView = new App.Views.Stone({ color: meta.color, showHistoryMarker: true });
                $box.append(stoneView.render().el);
                _this.currentStones[xCoord + ',' + yCoord] = stoneView;
                _this.playStoneSound();
            } else {
                // Some sort of server error
                console.log('something went wrong from server');
            }
        });
    },

    placeStoneWithoutEvents: function(color, coord, playSound) {
        if (playSound == undefined) {
            playSound = true;
        }

        this.removeLastMarker();

        var $box = this.$el.find('.matrix td[data-x="' + coord.x + '"][data-y="' + coord.y + '"]');
        var stoneView = new App.Views.Stone({ color: color, showHistoryMarker: true });
        
        $box.append(stoneView.render().el);
        this.currentStones[coord.x + ',' + coord.y] = stoneView;

        if (playSound) {
            this.playOpponentStoneSound();
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

    removeLastMarker: function() {
        this.$el.find('.matrix td .stone .marker').remove();
    },

    showGhostStone: function(e) {
        // Only show this when it's the players turn
        if (!this.parentView.isPlayersTurn) {
            return;
        }

        var $box = $(e.currentTarget);

        // Do nothing if stone exists
        if ( $box.find('.stone').length ) {
            return;
        }

        var stoneView = new App.Views.Stone({
            color: this.parentView.playerColor,
            ghost: true,
            showHistoryMarker: false
        });

        $box.append(stoneView.render().el);
    },

    hideGhostStone: function(e) {
        var $box = $(e.currentTarget);
        $box.find('.stone.ghost').remove();
    },

    playStoneSound: function() {
        this.$stoneSound.load();
        this.$stoneSound.play();
    },

    playOpponentStoneSound: function() {
        this.$stoneSoundOpponent.load();
        this.$stoneSoundOpponent.play();
    }
});