var Match = require('./match').Match;

var helpers = {
    whiteJoinMessage: function(match, player) {
        return match.logMessage(
            Match.MESSAGE_TYPE.SYSTEM,
            player.name + ' joined as white'
        );
    },

    blackJoinMessage: function(match, player) {
        return match.logMessage(
            Match.MESSAGE_TYPE.SYSTEM,
            player.name + ' joined as black'
        );
    },

    spectatorJoinMessage: function(match, player) {
        return match.logMessage(
            Match.MESSAGE_TYPE.SYSTEM,
            player.name + ' joined as spectator'
        );
    }
};

exports.helpers = helpers;