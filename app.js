var express = require('express');
var app = express();
var http = require('http');
var server = http.createServer(app);
var io = require('socket.io').listen(server);

server.listen(3000);

app.use("/stylesheets", express.static(__dirname + '/public/stylesheets'));
app.use("/sounds", express.static(__dirname + '/public/sounds'));
app.use("/images", express.static(__dirname + '/public/images'));
app.use("/javascripts", express.static(__dirname + '/public/javascripts'));

app.get('/', function(req, res) {
    res.sendfile(__dirname + '/public/index.html');
});

io.sockets.on('connection', function(socket) {
    console.log("connection made");
});