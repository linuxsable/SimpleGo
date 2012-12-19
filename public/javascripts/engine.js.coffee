window.App.Engine =
  matrix: []
  moveHistory: []
  initialized: false
  started: false
  matchStartTime: null
  captureCounts: {
    1: 0,
    2: 0
  }

  COLORS: {
    BLACK: 1,
    WHITE: 2
  }

  init: ->
    if @initialized
      throw 'already initialized' 

    @initMatrix()
    @initialized = true

  # Setup a 19x19 matrix
  initMatrix: ->
    @matrix = for x in [0..18]
      for y in [0..18]
        0

  startMatch: ->
    if @started
      throw 'already started'
    @startTimer()
    @started = true

  startTimer: ->
    @matchStartTime = new Date

  getMatchTimeInMiliseconds: ->
    if !@started
      return 0
    else
      return (new Date - @matchStartTime)

  # How many moves in the match?
  getMoveCount: ->
    @moveHistory.length

  # Add a move to the matrix and the move list
  enterMove: (color, x, y) ->
    if !@isValidColor(color)
      return false

    if !@isValidMove(color, x, y)
      return false

    if !@started
      @startMatch()

    # Add to matrix
    @matrix[x][y] = color 

    # Grab any captures for the view
    captures = @makeCaptures(color, x, y)
    
    # Add to capture counts
    @captureCounts[color] += captures.length

    # Add to history
    @moveHistory.push(color: color, x: x, y: y)

    if !_.isEmpty(captures)
      return captures
    else
      return true

  isValidColor: (color) ->
    return color == @COLORS.BLACK || color == @COLORS.WHITE

  isValidCoord: (x, y) ->
    if x > 18 || x < 0
      return false

    if y > 18 || y < 0
      return false

    return true

  isValidMove: (color, x, y) ->
    if !@isValidColor(color)
      return false

    if !@isValidCoord(x, y)
      return false

    if !@isCoordOpen(x, y)
      return false

    @matrix[x][y] = color
    if !@hasLiberties(x, y) && !@isCapture(color, x, y)
      @matrix[x][y] = 0
      return false
    else
      @matrix[x][y] = 0

    return true

  isCapture: (color, x, y) ->
    console.time('is capture')

    # Test the waters
    @matrix[x][y] = color

    result = (@isValidCoord(x, y-1) && !@isCoordOpen(x, y-1) && @getColorAtCoord(x, y-1) != color && !@hasLiberties(x, y-1) || @isValidCoord(x-1, y) && !@isCoordOpen(x-1, y) && @getColorAtCoord(x-1, y) != color && !@hasLiberties(x-1, y) || @isValidCoord(x+1, y) && !@isCoordOpen(x+1, y) && @getColorAtCoord(x+1, y) != color && !@hasLiberties(x+1, y) || @isValidCoord(x, y+1) && !@isCoordOpen(x, y+1) && @getColorAtCoord(x, y+1) != color && !@hasLiberties(x, y+1))

    @matrix[x][y] = 0

    console.timeEnd('is capture')

    return result

  hasLiberties: (x, y, visited={}) ->
    console.time('has liberties')

    # Kill if we run off the board
    if !@isValidCoord(x, y)
      console.timeEnd('has liberties')
      return false

    # Kill recursion if we find a liberty
    if @isCoordOpen(x, y-1) || @isCoordOpen(x-1, y) || @isCoordOpen(x+1, y) || @isCoordOpen(x, y+1)
      console.timeEnd('has liberties')
      return true

    currentColor = @getColorAtCoord(x, y)

    # Make a note that we have visited this node already
    visited[[x,y].join(',')] = true
 
    result = (!visited.hasOwnProperty([x,y-1].join(',')) && currentColor == @getColorAtCoord(x, y-1) && @hasLiberties(x, y-1, visited)) || (!visited.hasOwnProperty([x-1,y].join(',')) && currentColor == @getColorAtCoord(x-1, y) && @hasLiberties(x-1, y, visited)) || (!visited.hasOwnProperty([x+1,y].join(',')) && currentColor == @getColorAtCoord(x+1, y) && @hasLiberties(x+1, y, visited)) || (!visited.hasOwnProperty([x,y+1].join(',')) && currentColor == @getColorAtCoord(x, y+1) && @hasLiberties(x, y+1, visited))

    console.timeEnd('has liberties')

    return result

  getColorAtCoord: (x, y) ->
    return @isValidCoord(x, y) && @matrix[x][y]

  isCoordOpen: (x, y) ->
    return @isValidCoord(x, y) && @matrix[x][y] == 0

  capture: (x, y, visited={}) ->
    console.time('capture')
 
    # Return if we ran off the edge of the board
    if !@isValidCoord(x, y)
      console.timeEnd('capture')
      return []
 
    currentColor = @getColorAtCoord(x, y)

    # Make a note that we have visited this node already
    visited[[x,y].join(',')] = true
 
    # Remove the stone from the matrix
    @matrix[x][y] = 0
 
    # Traverse in all directions except the one we shouldn't go in
    # Also, only traverse if there is a stone in that direction and it is the same
    # color as the one we are looking at now
    # If we cannot traverse, store an empty list [] for that direction
    # Note that our buddy variables will contain the list of coordinates that were traversed
    # when travelling in that direction
    upBuddies = (!visited.hasOwnProperty([x,y-1].join(',')) && currentColor == @getColorAtCoord(x, y-1) && @capture(x, y-1, visited)) || []
    leftBuddies = (!visited.hasOwnProperty([x-1,y].join(',')) && currentColor == @getColorAtCoord(x-1, y) && @capture(x-1, y, visited)) || []
    rightBuddies = (!visited.hasOwnProperty([x+1,y].join(',')) && currentColor == @getColorAtCoord(x+1, y) && @capture(x+1, y, visited)) || []
    downBuddies = (!visited.hasOwnProperty([x,y+1].join(',')) && currentColor == @getColorAtCoord(x, y+1) && @capture(x, y+1, visited)) || []
 
    console.timeEnd('capture')
 
    # Concatenate our coordinate up with up all the traversed lists and return it up!
    return [[x,y]].concat(upBuddies).concat(leftBuddies).concat(rightBuddies).concat(downBuddies)

  # Make all necessary captures for a move played at x,y
  makeCaptures: (color, x, y) ->
    captures = []
 
    # Up
    if @isValidCoord(x, y-1) && !@isCoordOpen(x, y-1) && @getColorAtCoord(x, y-1) != color && !@hasLiberties(x, y-1)
      captures = @capture(x, y-1)
 
    # Left
    if @isValidCoord(x-1, y) && !@isCoordOpen(x-1, y) && @getColorAtCoord(x-1, y) != color && !@hasLiberties(x-1, y)
      captures = captures.concat(@capture(x-1, y))
 
    # Right
    if @isValidCoord(x+1, y) && !@isCoordOpen(x+1, y) && @getColorAtCoord(x+1, y) != color && !@hasLiberties(x+1, y)
      captures = captures.concat(@capture(x+1, y))
 
    # Down
    if @isValidCoord(x, y+1) && !@isCoordOpen(x, y+1) && @getColorAtCoord(x, y+1) != color && !@hasLiberties(x, y+1)
      captures = captures.concat(@capture(x, y+1))
 
    return captures