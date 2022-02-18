var io;
var gameSocket;
var wb = require('./wordBank');
//const Datastore = require('nedb');


exports.initGame = function(sio, socket){
    io = sio;
    gameSocket = socket;
    gameSocket.emit('connected');
    //console.log("Connection: PlayerID: " + gameSocket.id);

    //Host Events
    gameSocket.on('hostCreateNewGame', hostCreateNewGame);
    gameSocket.on('hostPrepareGame', hostPrepareGame);
    gameSocket.on('hostCountdownFinished', hostStartGame);
    gameSocket.on('hostNextRound', hostNextRound);
    gameSocket.on('firstPlayerJoined', firstPlayerJoined);

    //Player Events
    gameSocket.on('playerJoinGame', playerJoinGame);
    gameSocket.on('playerGuess', playerGuess);
    gameSocket.on('playerCorrectGuess', playerCorrectGuess);
    gameSocket.on('playerWrongGuess', playerWrongGuess);

    gameSocket.on('playerAnswer', playerAnswer);
    gameSocket.on('playerEndGame', playerEndGame);
    gameSocket.on('playerRestart', playerRestart);

    gameSocket.on('disconnecting',playerLeft); 

    //P5 drawing Events
    gameSocket.on("drawLine", playerDrawLine);
    gameSocket.on("resetCanvas", resetCanvas);
}

function playerDrawLine(data){
    var host = Array.from(gameSocket.adapter.rooms.get(data.gameId))[0];
    io.sockets.to(host).emit("drawLine", data);
};

function resetCanvas(data){
    io.sockets.in(data.gameId).emit("resetCanvas", data);
};

//HOST FUNCTIONS

function hostCreateNewGame() {

    var thisGameId = Math.floor(Math.random() * (9999 - 1001 + 1) + 1001);
    //var thisGameId = 1;
    
    //If this room does not yet exist, join it
    if(!gameSocket.adapter.rooms.get(thisGameId)){
        this.join(thisGameId);
        this.emit('newGameCreated', {gameId: thisGameId, mySocketId: this.id});
    }
    //Send undefined (need to try again)
    else{
        this.emit('newGameCreated', {gameId: undefined, mySocketId: this.id});
    }
    
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

function hostStartGame(data) {
    sendWords(0,data);
};

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

function playerJoinGame(data) {
    var sock = this;

    //Find the room
    var room = gameSocket.adapter.rooms.get(data.gameId);

    //If the room exists, join it
    if( room != undefined ){

        data.mySocketId = sock.id;

        sock.join(data.gameId);
        
        //Set player color
        var clients = gameSocket.adapter.rooms.get(data.gameId);
        var numClients = clients ? clients.size : 0;
        data.myColor = playerColors[numClients -2];

        io.sockets.in(data.gameId).emit('playerJoinedRoom', data);

    } else {
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

//Get three new words
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

    //Extra colors (darker playerColors)
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

