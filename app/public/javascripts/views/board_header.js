App.Views.BoardHeader = Backbone.View.extend({
    el: '.board-header',

    events: {
        
    },

    initialize: function() {
        this.parentView = this.options.parentView;

        this.$black = this.$('.left');
        this.$blackName = this.$('.left .top .name');
        this.$blackCaptureCount = this.$('.left .bottom .captures span');
        this.$white = this.$('.right');
        this.$whiteName = this.$('.right .top .name');
        this.$whiteCaptureCount = this.$('.right .bottom .captures span');
    },

    renderFromServer: function(playerList) {
        if (playerList.players.black) {
            this.$black.show();
            this.$blackName.html(playerList.players.black);    
        } else {
            this.$black.hide();
        }

        if (playerList.players.white) {
            this.$white.show();
            this.$whiteName.html(playerList.players.white);    
        } else {
            this.$white.hide();
        }
    },

    updateCaptureCounts: function(captures) {
        this.$blackCaptureCount.html(captures[1]);
        this.$whiteCaptureCount.html(captures[2]);
    }
});