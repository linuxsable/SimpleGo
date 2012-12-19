var express = require('express');
var io = require('socket.io');

var app = express();

app.get('/*', function(req, res, next) {
    var file = req.params[0];
    console.log('\t :: Express :: file requested : ' + file);
    res.sendfile( __dirname + '/public/' + file);
});

app.listen(3000);