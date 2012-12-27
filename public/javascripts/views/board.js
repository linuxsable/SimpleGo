App.Views.Board = Backbone.View.extend({
    el: '.board',

    events: {
        'click .matrix .box': 'placeStone' 
    },

    initialize: function() {
        this.parentView = this.options.parentView;
        this.$stoneSound = $('#stone-1')[0];
    },

    placeStone: function() {

    },

    playStoneSound: function() {
        this.$stoneSound.load();
        this.$stoneSound.play();
    }
});