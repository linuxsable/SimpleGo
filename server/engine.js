var _ = require('underscore');

function Engine() {
    this.matrix = [];
    this.moveHistory = [];
    this.captureCounts = { 1: 0, 2: 0 };
    this.COLORS = { BLACK: 1, WHITE: 2 };
    this.koCoord = { x: -1, y: -1 };

    this.initMatrix();
}

_.extend(Engine.prototype, {
    // Setup the default values for the matrix
    initMatrix: function() {
        var x, y;
        this.matrix = (function() {
            var _i, _results;
            _results = [];
            for (x = _i = 0; _i <= 18; x = ++_i) {
                _results.push((function() {
                    var _j, _results1;
                    _results1 = [];
                    for (y = _j = 0; _j <= 18; y = ++_j) {
                        _results1.push(0);
                    }
                    return _results1;
                })());
            }
            return _results;
        })();
    },

    getMoveCount: function() {
        return this.moveHistory.length;
    },

    // Returns false on error, true on success, array on capture
    // Array of capture is an array of captured stones
    enterMove: function(color, x, y) {
        if (!this.isValidColor(color)) {
            return false;
        }

        if (!this.isValidMove(color, x, y)) {
            return false;
        }

        this.matrix[x][y] = color;

        var captures = this.makeCaptures(color, x, y);
        this.captureCounts[color] += captures.length;

        this.moveHistory.push({
            color: color,
            x: x,
            y: y
        });

        if (!_.isEmpty(captures)) {
            return captures;
        } else {
            return true;
        }
    },

    isValidColor: function(color) {
        return color === this.COLORS.BLACK || color === this.COLORS.WHITE;
    },

    oppositeColor: function(color) {
        if(color === this.COLORS.BLACK) {
            return this.COLORS.WHITE;
        } else if(color === this.COLORS.WHITE) {
            return this.COLORS.BLACK;
        }
    },

    isValidCoord: function(x, y) {
        if (x > 18 || x < 0) {
            return false;
        }
        if (y > 18 || y < 0) {
            return false;
        }
        return true;
    },

    isValidMove: function(color, x, y) {
        if (!this.isValidColor(color)) {
            return false;
        }

        if (!this.isValidCoord(x, y)) {
            return false;
        }

        if (!this.isCoordOpen(x, y)) {
            return false;
        }

        // Illegal to play on ko coordinate
        if (x === this.koCoord.x && y === this.koCoord.y) {
            return false;
        }

        this.matrix[x][y] = color;

        if (!this.hasLiberties(x, y) && !this.isCapture(color, x, y)) {
            this.matrix[x][y] = 0;
            return false;
        } else {
            this.matrix[x][y] = 0;
        }

        return true;
    },

    isCapture: function(color, x, y) {
        console.time('is capture');

        this.matrix[x][y] = color;

        var result = this.isValidCoord(x, y - 1) && !this.isCoordOpen(x, y - 1) && this.getColorAtCoord(x, y - 1) !== color && !this.hasLiberties(x, y - 1) || this.isValidCoord(x - 1, y) && !this.isCoordOpen(x - 1, y) && this.getColorAtCoord(x - 1, y) !== color && !this.hasLiberties(x - 1, y) || this.isValidCoord(x + 1, y) && !this.isCoordOpen(x + 1, y) && this.getColorAtCoord(x + 1, y) !== color && !this.hasLiberties(x + 1, y) || this.isValidCoord(x, y + 1) && !this.isCoordOpen(x, y + 1) && this.getColorAtCoord(x, y + 1) !== color && !this.hasLiberties(x, y + 1);

        this.matrix[x][y] = 0;

        console.timeEnd('is capture');

        return result;
    },

    isKo: function(color, x, y, captures) {
        // It can only be a ko if only 1 stone was captured
        if (captures.length != 1) {
           return false;
        }

        // It is a ko if the opponent immediately playing in the spot where the stone
        // was captured would also be a capture
        return (this.isCapture(this.oppositeColor(color), captures[0][0], captures[0][1]));
        
    },

    hasLiberties: function(x, y, visited) {
        if (visited == null) {
            visited = {};
        }

        console.time('has liberties');

        if (!this.isValidCoord(x, y)) {
            console.timeEnd('has liberties');
            return false;
        }

        if (this.isCoordOpen(x, y - 1) || this.isCoordOpen(x - 1, y) || this.isCoordOpen(x + 1, y) || this.isCoordOpen(x, y + 1)) {
            console.timeEnd('has liberties');
            return true;
        }

        var currentColor = this.getColorAtCoord(x, y);

        visited[[x, y].join(',')] = true;

        var result = (!visited.hasOwnProperty([x, y - 1].join(',')) && currentColor === this.getColorAtCoord(x, y - 1) && this.hasLiberties(x, y - 1, visited)) || (!visited.hasOwnProperty([x - 1, y].join(',')) && currentColor === this.getColorAtCoord(x - 1, y) && this.hasLiberties(x - 1, y, visited)) || (!visited.hasOwnProperty([x + 1, y].join(',')) && currentColor === this.getColorAtCoord(x + 1, y) && this.hasLiberties(x + 1, y, visited)) || (!visited.hasOwnProperty([x, y + 1].join(',')) && currentColor === this.getColorAtCoord(x, y + 1) && this.hasLiberties(x, y + 1, visited));

        console.timeEnd('has liberties');

        return result;
    },

    getColorAtCoord: function(x, y) {
        return this.isValidCoord(x, y) && this.matrix[x][y];
    },

    isCoordOpen: function(x, y) {
        return this.isValidCoord(x, y) && this.matrix[x][y] === 0;
    },

    capture: function(x, y, visited) {
        if (visited == null) {
            visited = {};
        }

        console.time('capture');

        if (!this.isValidCoord(x, y)) {
            console.timeEnd('capture');
            return [];
        }

        var currentColor = this.getColorAtCoord(x, y);
        visited[[x, y].join(',')] = true;

        this.matrix[x][y] = 0;

        var upBuddies = (!visited.hasOwnProperty([x, y - 1].join(',')) && currentColor === this.getColorAtCoord(x, y - 1) && this.capture(x, y - 1, visited)) || [];
        var leftBuddies = (!visited.hasOwnProperty([x - 1, y].join(',')) && currentColor === this.getColorAtCoord(x - 1, y) && this.capture(x - 1, y, visited)) || [];
        var rightBuddies = (!visited.hasOwnProperty([x + 1, y].join(',')) && currentColor === this.getColorAtCoord(x + 1, y) && this.capture(x + 1, y, visited)) || [];
        var downBuddies = (!visited.hasOwnProperty([x, y + 1].join(',')) && currentColor === this.getColorAtCoord(x, y + 1) && this.capture(x, y + 1, visited)) || [];

        console.timeEnd('capture');

        return [[x, y]].concat(upBuddies).concat(leftBuddies).concat(rightBuddies).concat(downBuddies);
    },

    makeCaptures: function(color, x, y) {
        var captures = [];
        if (this.isValidCoord(x, y - 1) && !this.isCoordOpen(x, y - 1) && this.getColorAtCoord(x, y - 1) !== color && !this.hasLiberties(x, y - 1)) {
            captures = this.capture(x, y - 1);
        }
        if (this.isValidCoord(x - 1, y) && !this.isCoordOpen(x - 1, y) && this.getColorAtCoord(x - 1, y) !== color && !this.hasLiberties(x - 1, y)) {
            captures = captures.concat(this.capture(x - 1, y));
        }
        if (this.isValidCoord(x + 1, y) && !this.isCoordOpen(x + 1, y) && this.getColorAtCoord(x + 1, y) !== color && !this.hasLiberties(x + 1, y)) {
            captures = captures.concat(this.capture(x + 1, y));
        }
        if (this.isValidCoord(x, y + 1) && !this.isCoordOpen(x, y + 1) && this.getColorAtCoord(x, y + 1) !== color && !this.hasLiberties(x, y + 1)) {
            captures = captures.concat(this.capture(x, y + 1));
        }

        // Take care of ko
        if (this.isKo(color, x, y, captures)) {
            // Set variable to keep track of where illegal ko move is
            this.koCoord.x = captures[0][0];
            this.koCoord.y = captures[0][1];
            // TODO: Need to add code to mark ko on board
        } else {
            // Not a ko, clear out ko coordinates
            this.koCoord.x = -1;
            this.koCoord.y = -1;
        }

        return captures;
    }
});

exports.Engine = Engine;
