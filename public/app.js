var App = App || {};

let drawp5;
let hasEventListener = false;
;
jQuery(function($){    
    'use strict';

    //Prevent user from accidentally leave the game
   /*  $(window).on("beforeunload", function (event) {
        return "";
    }); */
    
    App = {

        gameId: 0,
        myRole: '',   // 'Player' or 'Host'
        mySocketId: '',
        currentRound: 0,
        maxRounds: 0,

        /**
         * Runs on first page load
         */
        init: function () {
            App.cacheElements();
            App.showInitScreen();
            App.bindEvents();

        },

        /**
         * References for templates
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
         * Click handlers for all the buttons
         */
        bindEvents: function () {
            // Host
            App.$doc.on('click', '#btnCreateGame', App.Host.onCreateClick);

            // Player
            App.$doc.on('click', '#btnJoin', App.Player.onJoinClick);
            App.$doc.on('click', '#btnJoinGame',App.Player.onPlayerJoinGameClick);
            App.$doc.on('click', '#btnStartGame',App.Player.onPlayerStartGameClick);
            App.$doc.on('click', '.btnAnswer',App.Player.onPlayerAnswerClick);
            App.$doc.on('click', '#btnPlayerEndGame', App.Player.onPlayerEndGame);
            App.$doc.on('click', '#btnPlayerRestart', App.Player.onPlayerRestart);

            App.$doc.on('click', '#btnGuess',App.Player.onPlayerGuessClick);
        },

        /**
         * Show the title screen
         */
        showInitScreen: function() {
            App.$gameArea.html(App.$templateIntroScreen);
            App.doTextFit('.title');
        },

        /* **************************
                  UTILITY CODE
           ************************** */


        /**
         * Counts down from startTime to 0 in element $el
         * @param  {} $el
         * @param  {} startTime
         * @param  {} callback
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
         * Textfit for the host
         * @param  {} el
         */
        doTextFit : function(el) {
            textFit(
                $(el)[0],{
                    alignHoriz:true,
                    alignVert:false,
                    widthOnly:true,
                    reProcess:true,
                    maxFontSize:300
                }
            );
        },

        /**
         * Textfit for the player
         * @param  {} el
         */
        doTextFitWord : function(el) {
            textFit(
                $(el)[0],{
                    alignHoriz:true,
                    alignVert:false,
                    widthOnly:true,
                    reProcess:true,
                    maxFontSize:40
                }
            );
        }

    };

    //Wait scripts to load before init
    $(App.$doc).ready(function(){
        App.init();
    });
   
}($));
