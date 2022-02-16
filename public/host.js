var App = App || {};

/* *******************************
*         HOST CODE           *
******************************* */
App.Host = {

    players: [],

    isNewGame: false,
    numPlayersInRoom: 0,
    currentCorrectWord: '',
    currentDrawer: '',
    
    /**
     * Get game info from server
     */
    onCreateClick: function () {
        IO.socket.emit('hostCreateNewGame');
    },

    /**
     * A new game has been created
     * @param  {} data
     */
    gameInit: function (data) {
        App.gameId = data.gameId;
        App.mySocketId = data.mySocketId;
        App.myRole = 'Host';
        App.Host.numPlayersInRoom = 0;

        App.Host.displayNewGameScreen();
    },

    /**
     * Show the game info
     */
    displayNewGameScreen : function() {
        App.$gameArea.html(App.$templateNewGame);
        
        // Display the URL on screen
        $('#gameURL').text(window.location.href);
        App.doTextFit('#gameURL');

        // Show the gameId / room id on screen
        $('#spanNewGameCode').text(App.gameId);
    },

    /**
     * A player has joined. Display them on screen.
     * @param  {} data
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
     * Game is starting, counting down
     * @param  {} data
     */
    gameCountdown : function(data) {

        App.maxRounds = data.maxRounds;
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

    /**
     * The drawer is choosing word, wait
     * @param  {} data
     */
    newWords : function(data) {
        
        $('#hostWord').html("Waiting for " + "<span id='wordColored'>"+ data.currentDrawer.playerName + "</span>" + " to choose a word"); 
        App.doTextFit('#hostWord');

        App.Host.currentDrawer = data.currentDrawer.playerName;
        App.Host.currentRound = data.round;
    },

    /**
     * The drawer has chosen a word. Time to play
     * @param  {} data
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

    /**
     * Check to see if player guess is correct
     * @param  {} data
     */
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
                drawp5.saveDrawing(App.Host.currentDrawer, App.Host.currentCorrectWord);
                
                IO.socket.emit('playerCorrectGuess',data);
            }
            else{
                IO.socket.emit('playerWrongGuess',data);
            }

            $("#playerGuesses").append($li);
        }
    },

    /**
     * A player guessed correctly
     * @param  {} data
     */
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
            var data = {
                gameId : App.gameId,
                round : App.currentRound,
                players : App.Host.players,
                maxRounds: App.maxRounds
            }
            $("#roundBar").hide();
            IO.socket.emit('hostNextRound',data);
        } 
        else {
            width +=0.08;
            $elem[0].style.width = width + "%";
        }
        }
    },

    /**
     * All rounds have been played
     * @param  {} data
     */
    gameOver : function(data) {

        var highestScore = -1;
        var winner = '';
        var tie;
        $.each(App.Host.players, function(){
            var pScore = +$('#' + this.mySocketId).find(".score").text();
            var pName = $('#' + this.mySocketId).find(".playerName").text();
            if(pScore > highestScore){
                highestScore = pScore;
                winner = pName;
                tie = false;
            }
            else if(pScore === highestScore){
                tie = true;
            }
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
        $("#hostWrapper").hide();
        App.Host.players = [];
        drawp5.drawEnabled = false;
    },
}
