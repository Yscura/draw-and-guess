//const { json } = require("express/lib/response");

var io;
var gameSocket;
var wb = require('./wordBank');
//const Datastore = require('nedb');

//This function is called by index.js to initialize a new game instance.
exports.initGame = function(sio, socket){
    io = sio;
    gameSocket = socket;
    gameSocket.emit('connected');
    //console.log("Connection: PlayerID: " + gameSocket.id);

    // Host Events
    gameSocket.on('hostCreateNewGame', hostCreateNewGame);
    gameSocket.on('hostPrepareGame', hostPrepareGame);
    gameSocket.on('hostCountdownFinished', hostStartGame);
    gameSocket.on('hostNextRound', hostNextRound);
    gameSocket.on('firstPlayerJoined', firstPlayerJoined);

    // Player Events
    gameSocket.on('playerJoinGame', playerJoinGame);
    gameSocket.on('playerGuess', playerGuess);
    gameSocket.on('playerCorrectGuess', playerCorrectGuess);
    gameSocket.on('playerWrongGuess', playerWrongGuess);

    gameSocket.on('playerAnswer', playerAnswer);
    gameSocket.on('playerEndGame', playerEndGame);
    gameSocket.on('playerRestart', playerRestart);


    gameSocket.on("drawLine", playerDrawLine);
    gameSocket.on("resetCanvas", resetCanvas);

    gameSocket.on('disconnecting',playerLeft); 
}


function playerDrawLine(data){
    var host = Array.from(gameSocket.adapter.rooms.get(data.gameId))[0];
    io.sockets.to(host).emit("drawLine", data);
};


function resetCanvas(data){
    io.sockets.in(data.gameId).emit("resetCanvas", data);
};

//HOST FUNCTIONS

//The 'START' button was clicked and 'hostCreateNewGame' event occurred.
function hostCreateNewGame() {
    // Create a unique Socket.IO Room

    //var thisGameId = ( Math.random() * 10000 ) | 0;
    var thisGameId = 1;

    // Return the Room ID (gameId) and the socket ID (mySocketId) to the browser client
    this.emit('newGameCreated', {gameId: thisGameId, mySocketId: this.id});

    // Join the Room and wait for the players
    this.join(thisGameId);
    
};

function hostPrepareGame(data) {

    var clients = gameSocket.adapter.rooms.get(data.gameId);
    var numClients = clients ? clients.size : 0;

    //Min 2 Players + Host
    if(numClients > 2){
        var sock = this;
        var data = {
            mySocketId : sock.id,
            gameId : data.gameId,
            maxRounds: data.maxRounds
        };

        io.sockets.in(data.gameId).emit('beginNewGame', data);
    }
    else {
        this.emit('error',{message: "You need more players."} );
    }
    
}

//The Countdown has finished, and the game begins!
function hostStartGame(data) {
    sendWords(0,data);
};

//A player answered correctly. Time for the next word.
function hostNextRound(data) {
    if(data.round < data.maxRounds){
        if(!data.word){
            sendWords(data.round, data);
        }
        else{
            sendWord(data);
        }
    } 
    else{
        var firstPlayer = Array.from(gameSocket.adapter.rooms.get(data.gameId))[1];
        data.firstPlayer = firstPlayer;
        io.sockets.in(data.gameId).emit('gameOver',data);
    }
}

//PLAYER FUNCTIONS


//A player clicked the 'START GAME' button. Attempt to connect them to the room 
function playerJoinGame(data) {

    // A reference to the player's Socket.IO socket object
    var sock = this;

    // Look up the room ID in the Socket.IO manager object.
    var room = gameSocket.adapter.rooms.get(data.gameId);

    // If the room exists...
    if( room != undefined ){
        // attach the socket id to the data object.
        data.mySocketId = sock.id;

        // Join the room
        sock.join(data.gameId);
        
        var clients = gameSocket.adapter.rooms.get(data.gameId);
        var numClients = clients ? clients.size : 0;
        data.myColor = playerColors[numClients -2];

        // Emit an event notifying the clients that the player has joined the room.
        io.sockets.in(data.gameId).emit('playerJoinedRoom', data);

    } else {
        // Otherwise, send an error message back to the player.
        this.emit('error',{message: "This room does not exist."} );
    }
}

function firstPlayerJoined(data){
    io.sockets.to(data.playerId).emit('firstPlayerJoined', data);
}

function playerGuess(data) {
    io.sockets.in(data.gameId).emit('hostCheckGuess', data);
}

function playerWrongGuess(data) {
    io.sockets.to(data.playerId).emit('wrongGuess', data);
}

function playerCorrectGuess(data) {
    io.sockets.in(data.gameId).emit('correctGuess', data);
}

function playerAnswer(data) {
    io.sockets.in(data.gameId).emit('hostCheckAnswer', data);
}

function playerEndGame(data) {
    io.sockets.in(data.gameId).emit('endGame',data);
}

function playerRestart(data) {
    data.mySocketId = this.id;
    io.sockets.in(data.gameId).emit('playerJoinedRoom',data);
}

function playerLeft() {
    var playerId =  this.id;
    var gameId = Array.from(this.rooms)[1];
    
    if(gameId){
        io.sockets.in(gameId).emit('playerLeft', playerId);
    }
}

//GAME LOGIC

function sendWords(round, dataR) {
    var wordData = getWordData();
    var currentDrawer = dataR.players[round % dataR.players.length];
    var data = {
        round: round,
        currentDrawer: currentDrawer,
        words: wordData

    }
    io.sockets.in(dataR.gameId).emit('newWordData', data);
}

function sendWord(data) {
    //The drawer has chosen their word, send it 
    io.sockets.in(data.gameId).emit('newRoundData', data);
}

//This function does all the work of getting a new words
function getWordData(){
    
    var words = [];
    var randIndexes = randomInts(3, wb.wordDbswe.length);
    randIndexes.forEach(elem => words.push(wb.wordDbswe[elem]));
    /* var randIndexes = randomInts(3, testWords.length);
    randIndexes.forEach(elem => words.push(testWords[elem])); */

    return words;
}

function randomInts(quantity, max){
    const arr = []
    while(arr.length < quantity){
      var candidateInt = Math.floor(Math.random() * max) 
      if(arr.indexOf(candidateInt) === -1) arr.push(candidateInt)
    }
  return(arr)
  }


var wordDb = [
    "cat", 
    "dog", 
    "house", 
    "moon", 
    "tree", 
    "book", 
    "phone", 
    "window", 
    "hedgehog", 
    "church",
    "car",
    "clock",
    "toaster",
    "mountain"
    
]

var testWords = [
    "c", 
    "fghfghfghfghfgh fghfgh", 
    "house",
]

var playerColors = [
    //Main playerColors
    'hsla(240,60%,40%,1)', //blue
    'hsla(0,60%,40%,1)',   //red
    'hsla(120,60%,40%,1)', //green
    'hsla(270,60%,40%,1)', //purple
    'hsla(30,60%,40%,1)',  //orange
    'hsla(180,60%,40%,1)', //light-blue
    'hsla(60,60%,40%,1)',  //yellow
    'hsla(300,60%,40%,1)', //pink
    'hsla(150,60%,40%,1)', //light-green-blue
    'hsla(330,60%,40%,1)', //pink-red
    'hsla(90,60%,40%,1)',  //light-green
    'hsla(210,60%,40%,1)', //light-blue-blue

    //Extra darker playerColors
    //TODO: add more for more players
    'hsla(240,80%,20%,1)', //blue
    'hsla(0,80%,20%,1)',   //red
    'hsla(120,80%,20%,1)', //green
    'hsla(270,80%,20%,1)', //purple
    'hsla(30,80%,20%,1)',  //orange
    'hsla(180,80%,20%,1)', //light-blue
    'hsla(60,80%,20%,1)',  //yellow
    'hsla(300,80%,20%,1)', //pink
    'hsla(150,80%,20%,1)', //light-green-blue
    'hsla(330,80%,20%,1)', //pink-red
    'hsla(90,80%,20%,1)',  //light-green
    'hsla(210,80%,20%,1)', //light-blue-blue

  ]

