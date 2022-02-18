let IO;
IO = {
    
    //Connect client to the server
    init: function() {
        IO.socket = io.connect(window.location.href,{closeOnBeforeunload: false});
        IO.bindEvents();
    },

    //Events from the server
    bindEvents : function() {
        IO.socket.on('connected', IO.onConnected);
        IO.socket.on('playerLeft', IO.onPlayerLeft);
        IO.socket.on('playerReconnect', IO.onPlayerReconnect);
        IO.socket.on('newGameCreated', IO.onNewGameCreated);
        IO.socket.on('playerJoinedRoom', IO.playerJoinedRoom);
        IO.socket.on('playerSubmitPortrait', IO.playerSubmitPortrait);
        
        IO.socket.on('firstPlayerJoined', IO.firstPlayerJoined);
        IO.socket.on('beginNewGame', IO.beginNewGame);
        IO.socket.on('newWordData', IO.onNewWordData);
        IO.socket.on('newRoundData', IO.onNewRoundData);
        IO.socket.on('hostCheckGuess', IO.hostCheckGuess);
        IO.socket.on('correctGuess', IO.onCorrectGuess);
        IO.socket.on('wrongGuess', IO.playerWrongGuess);
        IO.socket.on('gameOver', IO.gameOver);
        IO.socket.on('endGame', IO.endGame);
        IO.socket.on('error', IO.error);

    },

    //Events from the P5 sketch
    bindp5: function(){
        IO.socket.on("drawLine", drawp5.newDrawing);
        IO.socket.on("resetCanvas", drawp5.resetGlobal);
        
    },

    getSocket: function(){
        return IO.socket;
    },

    /**
     * The client is successfully connected!
     */
    onConnected : function() {

       /*  var pstorage = localStorage.getItem('playerData');
        var pData = JSON.parse(pstorage);
        console.log(pData);
        if(pData){
            console.log(pData.gameId);
            $("#gameArea").html("Trying to reconnect...").css("color", "white");
            IO.socket.emit('playerReconnect', pData);
            App.mySocketId = pData.mySocketId;
            //localStorage.removeItem('playerData');
        }
    else{ }*/
        App.mySocketId = IO.socket.id;
        
    },

    /* onPlayerReconnect : function(data) {
        console.log("player reconnected: " + data.playerName)
        App[App.myRole].updateWaitingScreen(data);
    }, */

     onPlayerLeft : function(playerId) {
        if(App.myRole === 'Host') {
            App.Host.playerLeft(playerId);
        }
    },

    onNewGameCreated : function(data) {
        App.Host.gameInit(data);
    },

    playerJoinedRoom : function(data) {
        if(App.myRole === 'Player') {
            App.Player.drawPortrait(data);
        }
    },

    playerSubmitPortrait : function(data) {
        App[App.myRole].updateWaitingScreen(data);
    },

    firstPlayerJoined : function(data) {
        if(App.myRole === 'Player') {
            App.Player.displayStartButton(data);
        }
    },

    beginNewGame : function(data) {
        App[App.myRole].gameCountdown(data);
    },

    onNewWordData : function(data) {
        App.currentRound = data.round;
    
        App[App.myRole].newWords(data);
    },

    onNewRoundData : function(data) {
        if(!drawp5){
            drawp5 = new p5(s);
            IO.bindp5();
        }
        drawp5.linkToParent();
        
        App[App.myRole].newRound(data);
    },

    hostCheckGuess : function(data) {
        if(App.myRole === 'Host') {
            App.Host.checkGuess(data);
        }
    },

    onCorrectGuess : function(data) {
        App[App.myRole].correctGuess(data);
    },

    playerWrongGuess : function(data) {
        if(App.myRole === 'Player') {
            App.Player.wrongGuess(data);
        }
    },

    gameOver : function(data) {
        App[App.myRole].gameOver(data);
    },

    endGame : function(data) {
        if(App.myRole === 'Player') {
            App.Player.endGame(data);
        }
    },

    //Show error msg
    error : function(data) {
        alert(data.message);
    }

};

IO.init();
