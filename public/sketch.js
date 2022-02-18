const s = (p) => {
    var socket;
    let gameId;

    let canvas, graphics;
    let red, green, blue, yellow, white, black, eraser;
    let tiny, small, medium, large;
    let currentColor, currentSize, currentBackColor, backgroundColor;
    let eraseEnabled = false;

    p.setup = function(){
        backgroundColor = p.color(255);
        currentBackColor = backgroundColor;
        red = p.color(255,50,20);
        green = p.color(20,255,50);
        blue = p.color(20,50,255);
        yellow = p.color(255,255,0);
        white = p.color(255);
        black = p.color(0);
        grey = p.color(150);
        wine = p.color(60,20,20);

        eraser = p.color(240, 240, 190);

        tiny = 3;
        small = 10;
        medium = 20;
        large = 30;

        p.initDivs();
        
        canvas = p.createCanvas(400, 400);
        canvas.style('borderRadius', '4%');
        canvas.parent(p.canvas_holder);
        graphics = p.createGraphics(400, 400);
        p.thumbnails = [];
        
        p.frameRate(120);

        p.background(backgroundColor);
        
        graphics.stroke(black);
        currentColor = black;
        
        graphics.strokeWeight(small);
        currentSize = small;

        p.initButtons();

        socket = IO.getSocket();
        gameId = App.gameId;

        p.drawEnabled = false;
        p.isHost = false;
    };

    p.draw = function(){
        if(p.isHost){
            p.scale(1.5);
            
        }
        p.image(graphics,0,0);
        
    }

    /* p.windowResized = function(){
       TODO: Fill canvas in parent div
    } */

    p.hostCanvas = function(args){
        p.resizeCanvas(600,600);
        p.isHost = true;
    }

    p.saveDrawing = function(name, word){
        //let imgString = graphics.elt.toDataURL();
        //p.thumbnails.push([imgString, name, word]);
        //let showImg = createImage(imgString, "");
        //showImg.hide():
        //Convert imgString to blob before sending it to the server

        let gs = canvas.get();
        p.thumbnails.push([gs, name, word]);
    }

    p.newDrawing = function(data){
        console.log("drawing recieved");
        if(data.e){
            graphics.erase();
        }
        else{
            graphics.noErase();
        }
        p.background(data.bc.levels);
        graphics.strokeWeight(data.s);
        graphics.stroke(data.c.levels);
        graphics.line(data.x, data.y, data.px, data.py);
        
    }

    p.mouseDragged = function(){
        if (p.mouseX <= p.width && p.mouseX >= 0 && p.mouseY <= p.height && p.mouseY >= 0){
            if(p.drawEnabled){
                var data = {
                    gameId: gameId,
                    x: p.mouseX,
                    y: p.mouseY,
                    px: p.pmouseX, 
                    py: p.pmouseY,
                    c: currentColor,
                    s: currentSize,
                    bc: currentBackColor,
                    e: eraseEnabled,
                }
                
                p.background(currentBackColor);
                graphics.strokeWeight(currentSize);
                graphics.stroke(currentColor);
                graphics.line(p.mouseX, p.mouseY, p.pmouseX, p.pmouseY);

                socket.emit("drawLine", data);
            }
        }
        return false;
    }

    p.mousePressed = function(){
        if(p.drawEnabled){
            var data = {
                gameId: gameId,
                x: p.mouseX,
                y: p.mouseY,
                px: p.pmouseX, 
                py: p.pmouseY,
                c: currentColor,
                s: currentSize,
                bc: currentBackColor,
                e: eraseEnabled
            }
            
            p.background(currentBackColor);
            graphics.strokeWeight(currentSize);
            graphics.stroke(currentColor);
            graphics.circle(p.mouseX, p.mouseY, currentSize/10);

            socket.emit("drawLine", data);
        }
    }
    
    p.reset = function(){
        var data = {
            gameId: gameId,
            bc: currentBackColor
        }

        graphics.clear();
        graphics.remove();
        p.background(data.bc.levels);
        socket.emit("resetCanvas", data);
    
    }

    p.resetGlobal = function(data){
        graphics.clear();
        graphics.remove();
        if(!data.bc){
            p.background(white);
            graphics.strokeWeight(10);
            graphics.stroke(0);
            currentColor = black;
            currentSize = small;
            currentBackColor = white;
            graphics.noErase();
            eraseEnabled = false;
        }else{
            
            p.background(data.bc.levels);
        }
    }

    p.linkToParent = function(){
        p.masterDiv.parent("drawarea");
    }

    p.initDivs = function(){
        p.masterDiv = p.createDiv();
        p.canvas_holder = p.createDiv();
        p.draw_buttons = p.createDiv();
        p.background_buttons = p.createDiv();
        p.color_buttons = p.createDiv();
        p.size_buttons = p.createDiv();
        p.utility_buttons = p.createDiv();

        p.canvas_holder.parent(p.masterDiv);
        p.draw_buttons.parent(p.masterDiv);

        p.background_buttons.parent(p.draw_buttons);

        p.color_buttons.parent(p.draw_buttons);
        p.color_buttons.style('margin-top', "10px");

        p.size_buttons.parent(p.draw_buttons);
        p.size_buttons.style('margin-top', "10px");
        p.size_buttons.style("font-family", "'Quicksand', sans-serif");
        p.size_buttons.style("font-size", "16px");
        p.size_buttons.style("font-weight", "400");

        p.utility_buttons.parent(p.draw_buttons);
        p.utility_buttons.style('margin-top', "10px");

    }

    p.initButtons = function(){
        const buttonSize = 30;
        const margin = "10px";
    
        let buttonReset = p.createButton("Reset");
        buttonReset.parent(p.utility_buttons);
        buttonReset.style("background-color", eraser);
        buttonReset.size(buttonSize + 40, buttonSize);
        buttonReset.mousePressed(p.reset);
        buttonReset.style('borderRadius', '5px');
        buttonReset.style('margin-right', margin);
        buttonReset.style("font-family", "'Quicksand', sans-serif");
        buttonReset.style("font-size", "16px");
        buttonReset.style("font-weight", "400");

        let buttonErase = p.createButton("Erase");
        buttonErase.parent(p.utility_buttons);
        buttonErase.style("background-color", eraser);
        buttonErase.size(buttonSize + 30, buttonSize);
        buttonErase.mousePressed(p.setErase);
        buttonErase.style('borderRadius', '5px');
        buttonErase.style('margin-right', margin);
        buttonErase.style("font-family", "'Quicksand', sans-serif");
        buttonErase.style("font-size", "16px");
        buttonErase.style("font-weight", "400");


        //Colors
        let buttonRed = p.createButton("");
        buttonRed.parent(p.color_buttons);
        buttonRed.style("background-color", red);
        buttonRed.size(buttonSize,buttonSize);
        buttonRed.mousePressed(p.setColorRed);
        buttonRed.style('borderRadius', '50%');
        buttonRed.style('margin-right', margin);
    
        let buttonGreen = p.createButton("");
        buttonGreen.parent(p.color_buttons);
        buttonGreen.style("background-color", green);
        buttonGreen.size(buttonSize,buttonSize);
        buttonGreen.mousePressed(p.setColorGreen);
        buttonGreen.style('borderRadius', '50%');
        buttonGreen.style('margin-right', margin);
    
        let buttonBlue = p.createButton("");
        buttonBlue.parent(p.color_buttons);
        buttonBlue.style("background-color", blue);
        buttonBlue.size(buttonSize,buttonSize);
        buttonBlue.mousePressed(p.setColorBlue);
        buttonBlue.style('borderRadius', '50%');
        buttonBlue.style('margin-right', margin);
    
        let buttonYellow = p.createButton("");
        buttonYellow.parent(p.color_buttons);
        buttonYellow.style("background-color", yellow);
        buttonYellow.size(buttonSize,buttonSize);
        buttonYellow.mousePressed(p.setColorYellow);
        buttonYellow.style('borderRadius', '50%');
        buttonYellow.style('margin-right', margin);

        let buttonWhite = p.createButton("");
        buttonWhite.parent(p.color_buttons);
        buttonWhite.style("background-color", white);
        buttonWhite.size(buttonSize,buttonSize);
        buttonWhite.mousePressed(p.setColorWhite);
        buttonWhite.style('borderRadius', '50%');
        buttonWhite.style('margin-right', margin);
    
        let buttonBlack = p.createButton("");
        buttonBlack.parent(p.color_buttons);
        buttonBlack.style("background-color", black);
        buttonBlack.size(buttonSize,buttonSize);
        buttonBlack.mousePressed(p.setColorBlack);
        buttonBlack.style('borderRadius', '50%');
        buttonBlack.style('margin-right', margin);


        //Sizes
        let buttonTiny = p.createButton("S");
        buttonTiny.parent(p.size_buttons);
        buttonTiny.style("background-color", black);
        buttonTiny.style("color", p.color(white));
        buttonTiny.size(buttonSize, buttonSize);
        buttonTiny.mousePressed(p.setDrawtiny);
        buttonTiny.style('borderRadius', '50%');
        buttonTiny.style('margin-right', margin);

        let buttonSmall = p.createButton("M");
        buttonSmall.parent(p.size_buttons);
        buttonSmall.style("background-color", black);
        buttonSmall.style("color", p.color(white));
        buttonSmall.size(buttonSize, buttonSize);
        buttonSmall.mousePressed(p.setDrawsmall);
        buttonSmall.style('borderRadius', '50%');
        buttonSmall.style('margin-right', margin);

        let buttonMedium = p.createButton("L");
        buttonMedium.parent(p.size_buttons);
        buttonMedium.style("background-color", black);
        buttonMedium.style("color", p.color(white));
        buttonMedium.size(buttonSize, buttonSize);
        buttonMedium.mousePressed(p.setDrawmedium);
        buttonMedium.style('borderRadius', '50%');
        buttonMedium.style('margin-right', margin);

        let buttonLarge = p.createButton("XL");
        buttonLarge.parent(p.size_buttons);
        buttonLarge.style("background-color", black);
        buttonLarge.style("color", p.color(white));
        buttonLarge.size(buttonSize, buttonSize);
        buttonLarge.mousePressed(p.setDrawlarge);
        buttonLarge.style('borderRadius', '50%');
        buttonLarge.style('margin-right', margin);
    

        //Backgrounds
        let buttonBackBlack = p.createButton("");
        buttonBackBlack.parent(p.background_buttons);
        buttonBackBlack.style("background-color", black);
        buttonBackBlack.size(buttonSize,buttonSize/3);
        buttonBackBlack.mousePressed(p.setBackColorBlack);
        buttonBackBlack.style('margin-right', margin);

        let buttonBackWhite = p.createButton("");
        buttonBackWhite.parent(p.background_buttons);
        buttonBackWhite.style("background-color", white);
        buttonBackWhite.size(buttonSize,buttonSize/3);
        buttonBackWhite.mousePressed(p.setBackColorWhite);
        buttonBackWhite.style('margin-right', margin);

        let buttonBackGrey = p.createButton("");
        buttonBackGrey.parent(p.background_buttons);
        buttonBackGrey.style("background-color", grey);
        buttonBackGrey.size(buttonSize,buttonSize/3);
        buttonBackGrey.mousePressed(p.setBackColorGrey);
        buttonBackGrey.style('margin-right', margin);

        let buttonBackWine = p.createButton("");
        buttonBackWine.parent(p.background_buttons);
        buttonBackWine.style("background-color", wine);
        buttonBackWine.size(buttonSize,buttonSize/3);
        buttonBackWine.mousePressed(p.setBackColorWine);
        buttonBackWine.style('margin-right', margin);
    }

    p.setErase = function(){
        graphics.erase();
        eraseEnabled = true;
    }

    p.setColorRed = function(){
        graphics.noErase();
        eraseEnabled = false;
        graphics.stroke(red);
        currentColor = red;
    }

    p.setColorGreen = function(){
        graphics.noErase();
        eraseEnabled = false;
        graphics.stroke(green);
        currentColor = green;
    }

    p.setColorBlue = function(){
        graphics.noErase();
        eraseEnabled = false;
        graphics.stroke(blue);
        currentColor = blue;
    }

    p.setColorYellow = function(){
        graphics.noErase();
        eraseEnabled = false;
        graphics.stroke(yellow);
        currentColor = yellow;
    }

    p.setColorWhite = function(){
        graphics.noErase();
        eraseEnabled = false;
        graphics.stroke(white);
        currentColor = white;
    }
    
    p.setColorBlack = function(){
        graphics.noErase();
        eraseEnabled = false;
        graphics.stroke(black);
        currentColor = black;
    }
    
    p.setDrawtiny = function(){
        graphics.strokeWeight(tiny);
        currentSize = tiny;
    }

    p.setDrawsmall = function(){
        graphics.strokeWeight(small);
        currentSize = small;
    }

    p.setDrawmedium = function(){
        graphics.strokeWeight(medium);
        currentSize = medium;
    }

    p.setDrawlarge = function(){
        graphics.strokeWeight(large);
        currentSize = large;
    }

    p.setBackColorBlack = function(){
        p.background(black);
        currentBackColor = black;
    }

    p.setBackColorWhite = function(){
        p.background(white);
        currentBackColor = white;
    }

    p.setBackColorGrey = function(){
        p.background(grey);
        currentBackColor = grey;
    }

    p.setBackColorWine = function(){
        p.background(wine);
        currentBackColor = wine;
    }

};

displayThumbnails = function(tn){
    tn.forEach(element => {
        var pic = new p5(t);
        pic.canvas = element[0];
        pic.g = element[0];
        pic.canvas.resize(200,0);

        pic.infoDiv.html(element[2] + "</br> by: " + element[1]);
    });
}

/**
 * Thumbnail object
 */
const t = (p) => {

    p.setup = function(){
        p.canvas = p.createCanvas(200, 200);
        
        p.background(255);
        p.g = p.createGraphics(200,200);

        p.masterDiv = p.createDiv();
        p.infoDiv = p.createDiv();
        p.masterDiv.parent("thumbnails");
        p.canvas.parent(p.masterDiv);
        p.infoDiv.parent(p.masterDiv);

        p.infoDiv.style("font-family", "'Quicksand', sans-serif");
        p.infoDiv.style("font-size", "20px");
        p.infoDiv.style("font-weight", "400");
        p.infoDiv.style("color", p.color(255));
        p.infoDiv.style("padding", "5px");
        p.infoDiv.style("text-align", "center");
        p.masterDiv.style("background-color", p.color("#375057"));
        
    }

    p.draw = function(){
        p.image(p.g,0,0);
    }

}

