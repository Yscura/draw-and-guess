let testIO;
let testApp;
let drawp5;
hasEventListener = false;
;
jQuery(function($){    
    'use strict';

    var IO = {

        /**
         * This is called when the page is displayed. It connects the Socket.IO client
         * to the Socket.IO server
         */
        init: function() {
            //IO.socket = io.connect('192.168.0.108:8080');
            IO.socket = io();
            
            IO.bindEvents();
        },

        /**
         * While connected, Socket.IO will listen to the following events emitted
         * by the Socket.IO server, then run the appropriate function.
         */
        bindEvents : function() {
            IO.socket.on('connected', IO.onConnected);
            IO.socket.on('reJoining', IO.onreJoining);
            IO.socket.on('newGameCreated', IO.onNewGameCreated);
            IO.socket.on('playerJoinedRoom', IO.playerJoinedRoom);
            IO.socket.on('firstPlayerJoined', IO.firstPlayerJoined);
            IO.socket.on('beginNewGame', IO.beginNewGame);
            IO.socket.on('newWordData', IO.onNewWordData);
            IO.socket.on('newRoundData', IO.onNewRoundData);
            IO.socket.on('hostCheckGuess', IO.hostCheckGuess);
            IO.socket.on('correctGuess', IO.onCorrectGuess);
            IO.socket.on('wrongGuess', IO.playerWrongGuess);
            IO.socket.on('gameOver', IO.gameOver);
            IO.socket.on('error', IO.error);

        },

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

           /*  if(localStorage.getItem('playerData')){
                $("#gameArea").html("Trying to reconnect...");
            } */
            // Cache a copy of the client's socket.IO session ID on the App
            App.mySocketId = IO.socket.id;
            
        },

        onreJoining : function(playerId) {
            App.mySocketId = playerId;
            console.log("Rejoining");
            
        },

        /**
         * A new game has been created and a random game ID has been generated.
         * @param data {{ gameId: int, mySocketId: * }}
         */
        onNewGameCreated : function(data) {
            App.Host.gameInit(data);
        },

        /**
         * A player has successfully joined the game.
         * @param data {{playerName: string, gameId: int, mySocketId: int}}
         */
        playerJoinedRoom : function(data) {
            App[App.myRole].updateWaitingScreen(data);
        },

        firstPlayerJoined : function(data) {
            if(App.myRole === 'Player') {
                App.Player.displayStartButton(data);
            }
        },

        /**
         * All players have joined the game.
         * @param data
         */
        beginNewGame : function(data) {
            App[App.myRole].gameCountdown(data);
            
        },

        /**
         * A new set of words for the round is returned from the server.
         * @param data
         */
        onNewWordData : function(data) {
            // Update the current round
            App.currentRound = data.round;
        
            App[App.myRole].newWords(data);
        },

        onNewRoundData : function(data) {
            // Update the current round
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

        /**
         * Let everyone know the game has ended.
         * @param data
         */
        gameOver : function(data) {
            App[App.myRole].endGame(data);
        },

        /**
         * An error has occurred.
         * @param data
         */
        error : function(data) {
            alert(data.message);
        }

    };

    var App = {

        /**
         * Keep track of the gameId, which is identical to the ID
         * of the Socket.IO Room used for the players and host to communicate
         *
         */
        gameId: 0,

        /**
         * This is used to differentiate between 'Host' and 'Player' browsers.
         */
        myRole: '',   // 'Player' or 'Host'

        /**
         * The Socket.IO socket object identifier. This is unique for
         * each player and host. It is generated when the browser initially
         * connects to the server when the page loads for the first time.
         */
        mySocketId: '',

        /**
         * Identifies the current round. Starts at 0 because it corresponds
         * to the array of word data stored on the server.
         */
        currentRound: 0,

        /* *************************************
         *                Setup                *
         * *********************************** */

        /**
         * This runs when the page initially loads.
         */
        init: function () {
            App.cacheElements();
            App.showInitScreen();
            App.bindEvents();

            /* // Initialize the fastclick library
            FastClick.attach(document.body); */
        },

        /**
         * Create references to on-screen elements used throughout the game.
         */
        cacheElements: function () {
            App.$doc = $(document);

            // Templates
            App.$gameArea = $('#gameArea');
            App.$templateIntroScreen = $('#intro-screen-template').html();
            App.$templateNewGame = $('#create-game-template').html();
            App.$templateJoinGame = $('#join-game-template').html();
            App.$templateStartGame = $('#start-game-template').html();
            App.$templateDrawWord = $('#draw-template').html();
            App.$hostGame = $('#host-game-template').html();
        },

        /**
         * Create some click handlers for the various buttons that appear on-screen.
         */
        bindEvents: function () {
            // Host
            App.$doc.on('click', '#btnCreateGame', App.Host.onCreateClick);

            // Player
            App.$doc.on('click', '#btnJoin', App.Player.onJoinClick);
            App.$doc.on('click', '#btnJoinGame',App.Player.onPlayerJoinGameClick);
            App.$doc.on('click', '#btnStartGame',App.Player.onPlayerStartGameClick);
            App.$doc.on('click', '.btnAnswer',App.Player.onPlayerAnswerClick);
            App.$doc.on('click', '#btnPlayerRestart', App.Player.onPlayerRestart);

            App.$doc.on('click', '#btnGuess',App.Player.onPlayerGuessClick);
        },

        /* *************************************
         *             Game Logic              *
         * *********************************** */

        /**
         * Show the initial Title Screen
         * (with Start and Join buttons)
         */
        showInitScreen: function() {
            App.$gameArea.html(App.$templateIntroScreen);
            App.doTextFit('.title');
        },


        /* *******************************
           *         HOST CODE           *
           ******************************* */
        Host : {

            players: [],

            isNewGame: false,
            numPlayersInRoom: 0,
            currentCorrectWord: '',
            currentDrawer: '',

            /**
             * Handler for the "Start" button on the Title Screen.
             */
            onCreateClick: function () {
                IO.socket.emit('hostCreateNewGame');
            },

            /**
             * The Host screen is displayed for the first time.
             * @param data{{ gameId: int, mySocketId: * }}
             */
            gameInit: function (data) {
                App.gameId = data.gameId;
                App.mySocketId = data.mySocketId;
                App.myRole = 'Host';
                App.Host.numPlayersInRoom = 0;

                App.Host.displayNewGameScreen();
            },

            /**
             * Show the Host screen containing the game URL and unique game ID
             */
            displayNewGameScreen : function() {
                // Fill the game screen with the appropriate HTML
                
                App.$gameArea.html(App.$templateNewGame);
                
                // Display the URL on screen
                $('#gameURL').text(window.location.href);
                App.doTextFit('#gameURL');

                // Show the gameId / room id on screen
                $('#spanNewGameCode').text(App.gameId);
            },

            /**
             * Update the Host screen when the first player joins
             * @param data{{playerName: string}}
             */
            updateWaitingScreen: function(data) {
                // If this is a restarted game, show the screen.
                if ( App.Host.isNewGame ) {
                    App.Host.isNewGame = false;
                    App.Host.displayNewGameScreen();
                }
                // Update host screen

                var $newP = $("<div/>").addClass("playerWaiting").append($("<div/>").text(data.playerName));
                $newP[0].style.backgroundColor = data.myColor;
                $("#playersWaitingBox").append($newP);

                // Store the new player's data on the Host.
                App.Host.players.push(data);
                // Increment the number of players in the room
                App.Host.numPlayersInRoom += 1;

                if(App.Host.numPlayersInRoom === 1){
                    data = {
                        gameId: App.gameId,
                        playerId: App.Host.players[0].mySocketId
                    }
                    IO.socket.emit('firstPlayerJoined', data);
                }
            },

            /**
             * Show the countdown screen
             */
            gameCountdown : function() {

                App.$gameArea.html(App.$hostGame);
                App.doTextFit('#hostWord');

                // Begin the on-screen countdown timer
                var $secondsLeft = $('#hostWord');
                App.countDown( $secondsLeft, 1, function(){
                    var data = {
                        gameId : App.gameId,
                        players : App.Host.players
                    }

                    IO.socket.emit('hostCountdownFinished', data);
                });
                $("#playerGuessBox").hide();
                $("#roundBar").hide();
               
                //Display player names & scores
                $.each(App.Host.players, function(){
                    var $p = $("<div/>").addClass("playerScore").attr('id', this.mySocketId)
                        .append($("<div/>").addClass("playerName").text(this.playerName))
                        .append($("<div/>").addClass("score").text(0));

                    $p[0].style.backgroundColor = this.myColor;
                    $("#playerScores").append($p);
                    
                });
               
            },


            newWords : function(data) {
               
                $('#hostWord').html("Waiting for " + "<span id='wordColored'>"+ data.currentDrawer.playerName + "</span>" + " to choose a word"); 
                App.doTextFit('#hostWord');
          
                App.Host.currentDrawer = data.currentDrawer.playerName;
                App.Host.currentRound = data.round;
            },

            /**
             * Show the word for the current round on screen.
             * @param data{{round: *, word: *, answer: *, list: Array}}
             */
            newRound : function(data) {
                //Reset displayed text
                $('#hostWord').text('');
                $("#playerGuesses").html('');

                $("#drawarea").show();
                //console.log("Width: " + $("#drawarea").width())
                $("#playerGuessBox").show();
                
                drawp5.draw_buttons.hide();
                drawp5.drawEnabled = false;

                if( $("#drawarea").width() >= 600){
                    drawp5.hostCanvas();
                }
                
                IO.socket.emit('resetCanvas',data);
                App.Host.currentCorrectWord = data.word;
            },


            checkGuess : function(data) {
                if (data.round === App.currentRound){

                    var guess = data.guess.toLowerCase();
                    var player = data.playerName;
                    
                    var $li = $('<li/>').addClass('playerGuess').html(player + ": " + guess);
                    $li[0].style.backgroundColor = data.myColor;

                    if( App.Host.currentCorrectWord === guess ) {
                        //Increase score
                        var $pScore = $('#' + data.playerId).find(".score");
                        $pScore.text( +$pScore.text() + 1);

                        $li.addClass('playerGuessCorrect');

                        App.currentRound += 1;

                        //Save canvas to thumbnail
                        drawp5.saveDrawing([App.Host.currentDrawer, App.Host.currentCorrectWord]);
                        
                        IO.socket.emit('playerCorrectGuess',data);
                    }
                    else{
                        IO.socket.emit('playerWrongGuess',data);
                    }

                    $("#playerGuesses").append($li);
                }
            },

            correctGuess : function(data) {
                $('#hostWord').html("<span id='wordColored'>"+ data.playerName + "</span>" + " guessed correctly!");
                App.doTextFit('#hostWord');
                //TODO: play soundeffect

                $("#roundBar").show();
                var i = 0;
                var $elem = $("#roundBar");
                var width = 1;
                var id = setInterval(updateBar, 1);
                function updateBar() {
                  if (width >= 100) {
                    clearInterval(id);
                    i = 0;
                    //Start next round after a short delay
                    var data = {
                        gameId : App.gameId,
                        round : App.currentRound,
                        players : App.Host.players
                    }
                    $("#roundBar").hide();
                    IO.socket.emit('hostNextRound',data);
                  } else {
                    width +=0.08;
                    $elem[0].style.width = width + "%";
                  }
                }
            },

            endGame : function(data) {
          
                var highestScore = -1;
                var winner = '';
                var tie;
                $.each(App.Host.players, function(){
                    var pScore = +$('#' + this.mySocketId).find(".score").text();
                    var pName = $('#' + this.mySocketId).find(".playerName").text();
                    if(pScore > highestScore){
                        highestScore = pScore;
                        winner = pName;
                    }
                    else if(pScore === highestScore){
                        tie = true;
                    }
                    //TODO: tie logic
                });

                if(tie){
                    $('#hostWord').text("It's a tie!");
                }
                else{
                    $('#hostWord').text( winner + ' Wins!' );
                }
                
                App.doTextFit('#hostWord');

                displayThumbnails(drawp5.thumbnails);
                drawp5.thumbnails = [];

                // Reset game data
                App.Host.numPlayersInRoom = 0;
                App.Host.isNewGame = true;
                //$("#drawarea").hide();
                //$("#playerGuessBox").hide();
                $("#hostWrapper").hide();
                App.Host.players = [];
                drawp5.drawEnabled = false;
            },
        },


        /* *****************************
           *        PLAYER CODE        *
           ***************************** */

        Player : {

            /**
             * A reference to the socket ID of the Host
             */
            hostSocketId: '',

            /**
             * The player's name entered on the 'Join' screen.
             */
            myName: '',

            myColor: '',

            /**
             * Is the player the current drawer?
             */
            isDrawer: false,

            /**
             * Click handler for the 'JOIN' button
             */
            onJoinClick: function () {
                App.$gameArea.html(App.$templateJoinGame);
            },

            /**
             * The player entered their name and gameId (hopefully)
             * and clicked Start.
             */
            onPlayerJoinGameClick: function() {
                var data = {
                    gameId : +($('#inputGameId').val()),
                    playerName : $('#inputPlayerName').val() || 'anon',
                };

                // Send the gameId and playerName to the server
                IO.socket.emit('playerJoinGame', data);

                // Set the appropriate properties for the current player.
                App.myRole = 'Player';
                App.Player.myName = data.playerName;
            },

            onPlayerStartGameClick: function(){
                IO.socket.emit('hostPrepareGame', App.gameId);
            },

            onPlayerGuessClick: function() {
                var guess = $('#inputGuess').val();
                if(guess){
                    var data = {
                        gameId : App.gameId,
                        playerId : App.mySocketId,
                        playerName: App.Player.myName,
                        myColor: App.Player.myColor,
                        guess: guess,
                        round: App.currentRound
                    };
    
                    IO.socket.emit('playerGuess', data);
                }
               
                $('#inputGuess').val('');

            },

            /**
             *  Click handler for the Player choosing a word.
             */
            onPlayerAnswerClick: function() {
                var $btn = $(this);      // the tapped button
                var word = $btn.val(); // The tapped word

                // Send the player info and tapped word to the server so
                // the host can check the answer.
                var data = {
                    gameId: App.gameId,
                    playerId: App.mySocketId,
                    word: word,
                    round: App.currentRound
                }
                IO.socket.emit('hostNextRound',data);
            },

            /**
             *  Click handler for the "Start Again" button that appears
             *  when a game is over.
             */
            onPlayerRestart : function() {
                var data = {
                    gameId : App.gameId,
                    playerName : App.Player.myName,
                    myColor: App.Player.myColor 
                }
                IO.socket.emit('playerRestart', data);
                App.currentRound = 0;
                $('#gameArea').html('<div class="restart">Please wait for the new game to begin.</div>');
                
            },

            updateWaitingScreen : function(data) {
                if(IO.socket.id === data.mySocketId){
                    App.gameId = data.gameId;

                    App.Player.myColor = data.myColor;
                    

                    //Save player data to not lose it on accidental refresh
                    localStorage.setItem('playerData', data);

                    $('#btnJoinGame').hide();
                    $('#playerWaitingMessage')
                        .append('<p/>')
                        .html('Joined Game ' + "<span id='wordColored'>"+ data.gameId + "</span>" + '. Please wait for game to begin.');
                        
                }
            },

            displayStartButton : function(data){
                App.$gameArea.html(App.$templateStartGame);
            },

            /**
             * Display 'Get Ready' while the countdown timer ticks down.
             * @param hostData
             */
            gameCountdown : function(hostData) {
                App.Player.hostSocketId = hostData.mySocketId;
                
                App.$gameArea.html(App.$templateDrawWord);
                $('#word').html(" Game is starting. Get ready! ");
                App.doTextFitWord('#word');
                
                $('#guesser').hide();
                $('#drawarea').hide();

            },

            newWords : function(data){
                //Set new drawer
                App.Player.isDrawer = false;
                if(data.currentDrawer.mySocketId === App.mySocketId){
                    App.Player.isDrawer = true;
                }
                $(App.$doc).ready(function(){
                    $("#guesser").hide();
                    $("#drawarea").hide();
                    
                });

                 //Show drawer page
                if(App.Player.isDrawer){

                    var $list = $('<ul/>').attr('id','ulWords');

                    // Insert a list item for each word in the word list
                    // received from the server.
                    $.each(data.words, function(){
                        
                        var $li = $('<li/>')
                            .append( $('<button/>')
                                .addClass('btnAnswer')
                                .addClass('btn')
                                .val(this)
                                .html(this)
                            );
                        
                        $list.append($li);
                        //App.doTextFitWord($li);
                    });
                    $('#drawer').show();
                    $("#wordList").show();
                    $('#wordList').html($list);
                    App.doTextFitWord('#wordList');
                    $('#word').html("Choose a word to draw.");
                    
                }
                //Show guesser page
                else{
                    $('#word').html("Wait for " + "<span id='wordColored'>"+ data.currentDrawer.playerName + "</span>" + " to choose a word.");
                    App.doTextFitWord('#word');
                }
                
            },

            /**
             * Show the list of words for the current round.
             * @param data{{round: *, word: *, answer: *, list: Array}}
             */
            newRound : function(data) {
                $("#wordList").hide();
                //Show drawer page
                if(App.Player.isDrawer){
                    $(App.$doc).ready(function(){
                        drawp5.drawEnabled = true;
                        $("#guesser").hide();
                        $("#drawer").show();
                        $("#drawarea").show();
                        $('#word').html("Draw: " + "<span id='wordColored'>"+ data.word+ "</span>");
                        App.doTextFitWord('#word');
                    }); 
                }
                //Show guesser page
                else{
                    $(App.$doc).ready(function(){
                        drawp5.drawEnabled = false;
                        $("#guesser").show();
                        $("#drawer").hide();
                        $("#drawarea").hide();
                    });

                    if(!hasEventListener){
                        $("#inputGuess").keypress(function(event) {
                            if (event.keyCode === 13) {
                                $("#btnGuess").click();
                            }
                        });
                        hasEventListener = true;
                    }
                }
            },

            correctGuess : function(data) {
                $("#drawer").show();

                if(data.playerId === App.mySocketId){
                    $('#word').html("<span id='wordColored'> You </span> got it right!");
                }
                else if(App.Player.isDrawer){
                    $('#word').html("<span id='wordColored'> Good job! </span> <p/> Someone got your word.");
                }
                else{
                    $('#word').html("Oh no! <p/> <span id='wordColored'>" + data.playerName + "</span> got it before you. ");
                }
                App.doTextFitWord('#word');

                $('#guesser').hide();
                $('#drawarea').hide();
                
            },

            wrongGuess: function(data){
                function complete(){
                    $('#wrongGuess').show();
                    $('#wrongGuess').html('');

                    //TODO: Get the div somehow
                }

                //TODO: insert into list and fade the list as it goes along
                $('#wrongGuess').prepend($("<div/>").html("<span id='wordColored'>"+ data.guess+ "</span>" + " is wrong. Try again.").fadeOut(1500, complete));
            },

            /**
             * Show the "Game Over" screen.
             */
            endGame : function() {
                $('#gameArea').html('<div class="gameOver">Game Over!</div>')
                    .append(
                        // Create a button to start a new game.
                        $('<button>New Game</button>')
                            .attr('id','btnPlayerRestart')
                            .addClass('btn')
                            .addClass('btnGameOver')
                );
                drawp5.drawEnabled = false;
                hasEventListener = false;
                
            }
        },

        /* **************************
                  UTILITY CODE
           ************************** */

        /**
         * Display the countdown timer on the Host screen
         *
         * @param $el The container element for the countdown timer
         * @param startTime
         * @param callback The function to call when the timer ends.
         */
        countDown : function( $el, startTime, callback) {

            // Display the starting time on the screen.
            $el.text(startTime);
            App.doTextFit('#hostWord');

            // Start a 1 second timer
            var timer = setInterval(countItDown,1000);

            // Decrement the displayed timer value on each 'tick'
            function countItDown(){
                startTime -= 1
                $el.text(startTime);
                App.doTextFit('#hostWord');

                if( startTime <= 0 ){
                    // Stop the timer and do the callback.
                    clearInterval(timer);
                    callback();
                    return;
                }
            }

        },

        /**
         * Make the text inside the given element as big as possible
         * @param el The parent element of some text
         */
        doTextFit : function(el) {
            textFit(
                $(el)[0],
                {
                    alignHoriz:true,
                    alignVert:false,
                    widthOnly:true,
                    reProcess:true,
                    maxFontSize:300
                }
            );
        },

        doTextFitWord : function(el) {
            textFit(
                $(el)[0],
                {
                    alignHoriz:true,
                    alignVert:false,
                    widthOnly:true,
                    reProcess:true,
                    maxFontSize:40
                }
            );
        }

    };

    IO.init();
    App.init();

    testIO = IO;
    testApp = App;

}($));
