var App = App || {};

/* *****************************
*        PLAYER CODE        *
***************************** */

App.Player = {

    myName: '',
    myColor: '',
    isDrawer: false,

    /**
     * Display join template.
     */
    onJoinClick: function () {
        App.$gameArea.html(App.$templateJoinGame);
    },

    /**
     * A new player is joining.
     */
    onPlayerJoinGameClick: function() {
        var data = {
            gameId : +($('#inputGameId').val()),
            playerName : $('#inputPlayerName').val() || 'anon',
        };

        IO.socket.emit('playerJoinGame', data);

        App.myRole = 'Player';
        App.Player.myName = data.playerName;
    },

    /**
     * The main player started the game.
     */
    onPlayerStartGameClick: function(){
        var numRounds = +($('#numRounds').val());
       
        var data = {
            gameId: App.gameId,
            maxRounds: numRounds
        }
        IO.socket.emit('hostPrepareGame', data);
    },

    /**
     * A player has guessed .
     */
    onPlayerGuessClick: function() {
        var guess = $('#inputGuess').val();

        //Prevent "empty" guesses
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
     * Player chose a word to draw.
     */
    onPlayerAnswerClick: function() {
        var $btn = $(this);      // the tapped button
        var word = $btn.val(); // The tapped word

        var data = {
            gameId: App.gameId,
            playerId: App.mySocketId,
            word: word,
            round: App.currentRound,
            maxRounds: App.maxRounds
        }
        IO.socket.emit('hostNextRound',data);
    },

    /**
     * Mainplayer ended the game.
     */
    onPlayerEndGame : function() {
        var data = {
            gameId : App.gameId
        }
        IO.socket.emit('playerEndGame', data);
    },

    /**
     * Player wants to play a new game.
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

    /**
     * A player has joined the game.
     * @param  data
     */
    updateWaitingScreen : function(data) {
        if(IO.socket.id === data.mySocketId){
            App.gameId = data.gameId;

            App.Player.myColor = data.myColor;
        
            //Save player data to not lose it on accidental refresh
            //localStorage.setItem('playerData', data);

            $('#btnJoinGame').hide();
            $('#playerWaitingMessage')
                .append('<p/>')
                .html('Joined Game ' + "<span id='wordColored'>"+ data.gameId + "</span>" + '. Please wait for game to begin.');
                
        }
    },

    /**
     * The first player of the game has joined.
     * @param  {} data
     */
    displayStartButton : function(data){
        //Only displayed for the first/"main" player
        App.$gameArea.html(App.$templateStartGame);
        //TODO: language input

        var $numRounds = $('#numRounds')[0];
        $("#rounds").text($numRounds.value);

        $numRounds.oninput = function() {
            $("#rounds").text($numRounds.value);
        }
    },

    /**
     * Game is starting, host is counting down.
     * @param  {} data
     */
    gameCountdown : function(data) {
        App.maxRounds = data.maxRounds;
        
        App.$gameArea.html(App.$templateDrawWord);
        $('#word').html(" Game is starting. Get ready! ");
        App.doTextFitWord('#word');
        
        $('#guesser').hide();
        $('#drawarea').hide();

    },

    /**
     * Current drawer gets words from the server.
     * @param  {} data
     */
    newWords : function(data){
        //Set current drawer
        App.Player.isDrawer = false;
        if(data.currentDrawer.mySocketId === App.mySocketId){
            App.Player.isDrawer = true;
        }

        $(App.$doc).ready(function(){
            $("#guesser").hide();
            $("#drawarea").hide();
        });

        //Add words to a list and display it
        if(App.Player.isDrawer){
            $('#word').html("Choose a word to draw.");

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
            });
            $('#drawer').show();
            $("#wordList").show();
            $('#wordList').html($list);
            App.doTextFitWord($list);
           
        }
        //Show wait msg
        else{
            $('#word').html("Wait for " + "<span id='wordColored'>"+ data.currentDrawer.playerName + "</span>" + " to choose a word.");
            App.doTextFitWord('#word');
        }
        
    },

    /**
     * Drawer has chosen a word. Time to play.
     * @param  {} data
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

    /**
     * A player has guessed correctly.
     * @param  {} data
     */
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

    /**
     * A guess was incorrect
     * @param  {} data
     */
    wrongGuess: function(data){
        var $guess = $("<div/>").html("<span id='wordColored'>"+ data.guess+ "</span>" + " is wrong. Try again.")
        $('#wrongGuess').prepend($guess);
        $guess.fadeOut(5000, function(){
            $guess.html('');
        })
    },

    /**
     * All rounds have been played.
     * Display end button for the mainplayer.
     * @param  {} data
     */
    gameOver : function(data) {
        $('#gameArea').html('<div class="gameOver">Game Over!</div>')
        drawp5.drawEnabled = false;
        hasEventListener = false;

        if(data.firstPlayer === App.mySocketId){
            $('#gameArea').append(
                $('<button>End Game</button>')
                .attr('id','btnPlayerEndGame')
                .addClass('btn')
                .addClass('btnGameOver')
            );
        }
        
    },

    /**
     * Allow all players to see restart button.
     */
    endGame : function() {
        $('#gameArea').append(
                    $('<button>Play again</button>')
                    .attr('id','btnPlayerRestart')
                    .addClass('btn')
                    .addClass('btnGameOver')
        );
        
    }
}