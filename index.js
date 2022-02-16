var express = require('express');

//var path = require('path');

var app = express();

var dg = require('./dggame');

app.use(express.static('public'));

const socket = require('socket.io');

// Create a Node.js server on port 8080
const PORT = process.env.PORT || 8080;
var server = app.listen(PORT, function(){
    console.log("Listening at port : " + PORT);
});

var io = socket(server);

// Listen for Socket.IO Connections. Once connected, start the game logic.
io.sockets.on('connection', function (socket) {
    dg.initGame(io, socket);
});