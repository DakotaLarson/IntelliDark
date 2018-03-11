(function(){
    const ignoredNodes = ['STYLE', 'SCRIPT', 'NOSCRIPT', 'IMG', 'VIDEO', 'CANVAS'];
    const styles = ['color', 'border-left-color', 'border-top-color', 'border-right-color', 'border-bottom-color', 'caret-color', 'outline-color', 'text-decoration-color'];
    const imageResults = {};
    const lightnessThreshold = 0.5;
    console.log(location.href);
    window.addEventListener("load", function() {
        console.log('Load Event Fired');
        let time = performance.now();
        let eltCount = updateElement(document.body, true);
        time = Number(performance.now() - time).toFixed(2);
        console.log('IntelliDark Update Complete (' + eltCount + ' nodes | ' + time + 'ms)');
    });
    function updateElement(element, parentStatus){
        let count = 1;
        //parentStatus = parent rendered "normally"; No JavaScript Manipulations
        let status = parentStatus;
        if(ignoredNodes.indexOf(element.nodeName) === -1){
            let style = window.getComputedStyle(element, null);
            if(style.backgroundImage !== 'none'){
                let backgroundImage = style.backgroundImage;
                if(backgroundImage.startsWith('url')){
                    console.log("We have a background image!");
                    getImageData(backgroundImage);
                    status = true;
                }else{
                    console.log("We have an unidentified background image! " + backgroundImage);
                    let newBG = handleBGGradient(backgroundImage);
                    if(newBG !== null){
                        element.style.setProperty('background-image', newBG, 'important');
                        for(let i = 0; i < styles.length; i ++){
                            let rawStyle = style.getPropertyValue(styles[i]);
                            if(rawStyle){
                                let color = Color.fromRGBString(rawStyle);
                                if(color.l < 1 - lightnessThreshold){
                                    color.l = 1 - color.l;
                                    element.style.setProperty(styles[i], color.stringify(), 'important');
                                }
                            }
                        }
                        status = false;
                    }else{
                        status = true;
                    }
                }
            }else{
                let color = Color.fromRGBString(style.backgroundColor);
                if(!color.isTransparent()){
                    //Element has a background color.
                        if(color.l >= lightnessThreshold){
                        color.l = 1 - color.l;
                        element.style.setProperty('background-color', color.stringify(), 'important');
                        for(let i = 0; i < styles.length; i ++){
                            let rawStyle = style.getPropertyValue(styles[i]);
                            if(rawStyle){
                                let color = Color.fromRGBString(rawStyle);
                                if(color.l < 1 - lightnessThreshold){
                                    color.l = 1 - color.l;
                                    element.style.setProperty(styles[i], color.stringify(), 'important');
                                }
                            }
                        }
                        status = false;
                    }else{
                        status = true;
                    }
                }else{
                    if(!status){
                        //Element is transparent, but parent is darkened.
                        for(let i = 0; i < styles.length; i ++){
                            let rawStyle = style.getPropertyValue(styles[i]);
                            if(rawStyle){
                                let color = Color.fromRGBString(rawStyle);
                                if(color.l < 1 - lightnessThreshold){
                                    color.l = 1 - color.l;
                                    element.style.setProperty(styles[i], color.stringify(), 'important');
                                }
                            }
                        }
                    }
                }
            }
        }
        for(let i = 0; i < element.children.length; i ++){
            count += updateElement(element.children[i], status);
        }
        return count;
    }
    function getImageData(rawUrl){
        if(rawUrl.startsWith('url')){
            if(imageResults.hasOwnProperty(rawUrl)){
                let color = imageResults[rawUrl];
                console.log(color);
            }else{
                let imgUrl = rawUrl.slice(5, -2);
                let imgElt = new Image;
                imgElt.crossOrigin = 'anonymous';
                imgElt.src = imgUrl;
                imgElt.onload = function(){
                    let canvasElt = document.createElement('canvas');
                    canvasElt.height = imgElt.height;
                    canvasElt.width = imgElt.width;
                    let canvasCtx = canvasElt.getContext('2d');
                    canvasCtx.drawImage(imgElt, 0, 0);
                    let imgData = canvasCtx.getImageData(0, 0, canvasElt.width, canvasElt.height);
                    let rAvg = 0;
                    let gAvg = 0;
                    let bAvg = 0;
                    let aAvg = 0;
                    let pixelCount = imgData.width * imgData.height;
                    //compute average
                    for(let i = 0; i < pixelCount; i ++){
                        rAvg += imgData.data[4 * i];
                        gAvg += imgData.data[4 * i + 1];
                        bAvg += imgData.data[4 * i + 2];
                        aAvg += imgData.data[4 * i + 3];
                    }
                    rAvg = Math.floor(rAvg / pixelCount);
                    gAvg = Math.floor(gAvg / pixelCount);
                    bAvg = Math.floor(bAvg / pixelCount);
                    aAvg = Math.floor(aAvg / pixelCount);
                    let averageColor = new Color(rAvg, gAvg, bAvg, aAvg);
                    let variance;
                    if(aAvg === 0){
                        //The image is transparent.
                        variance = {};
                    }else{
                        //compute variance
                        let rVar = 0;
                        let gVar = 0;
                        let bVar = 0;
                        let aVar = 0;
                        //compute average
                        for(let i = 0; i < pixelCount; i ++){
                            rVar += Math.pow(imgData.data[4 * i] - rAvg, 2);
                            gVar += Math.pow(imgData.data[4 * i + 1] - gAvg, 2);
                            bVar += Math.pow(imgData.data[4 * i + 2] - bAvg, 2);
                            aVar += Math.pow(imgData.data[4 * i + 3] - aAvg, 2);
                        }
                        rVar /= (pixelCount -1);
                        gVar /= (pixelCount -1);
                        bVar /= (pixelCount -1);
                        aVar /= (pixelCount -1);
                        variance = {
                            r: rVar,
                            g: gVar,
                            b: bVar,
                            a: aVar
                        };
                    }

                    imageResults[rawUrl] = {
                        avgerage: averageColor,
                        variance: variance
                    };
                    // console.log(rawUrl);
                    // console.log(averageColor);
                    // console.log(variance);
                }
            }
        }
    }
    function handleBGGradient(backgroundImage){
        //-webkit-linear-gradient(top, rgb(245, 245, 245), rgb(241, 241, 241))
        let funcNameEnd = backgroundImage.indexOf('(');
        let funcName = backgroundImage.slice(0, funcNameEnd);
        let rawArgs = backgroundImage.slice(funcNameEnd + 1, -1);
        let index = 0;
        let funcSections = [];
        while(index < rawArgs.length){
            index = rawArgs.indexOf('(', index);
            if(index === -1) break;
            funcSections.push([index]);
            index = rawArgs.indexOf(')', index);
            funcSections[funcSections.length - 1].push(index);
        }
        index = 0;
        let lastArgIndex = 0;
        let args = [];

        mainLoop: while(index < rawArgs.length) {
            index = rawArgs.indexOf(', ', index);
            if(index === -1){
                args.push(rawArgs.slice(lastArgIndex).trim());
                break;
            }
            for (let i = 0; i < funcSections.length; i++) {
                if (index > funcSections[i][0] && index < funcSections[i][1]){
                    index ++;
                    continue mainLoop;
                }
            }
            args.push(rawArgs.slice(lastArgIndex, index).trim());
            lastArgIndex = index + 1;
            index ++;
        }
        let colors = {};
        let avgLight = 0;
        for(let i = 0; i < args.length; i++){
            let arg = args[i];
            if(arg.startsWith('rgb')){
                let color = Color.fromRGBString(arg);
                avgLight += color.l;
                colors[i] = color;
            }
        }
        avgLight /= args.length;
        if(avgLight > lightnessThreshold){
            //The brightness is light on average; invert.
            for(let i in colors){
                let color =  colors[i];
                color.l = 1 - color.l;
            }
            let styleString = funcName + '(';
            for(let i = 0; i < args.length; i ++){
                if(colors.hasOwnProperty(i)){
                    styleString += colors[i].stringify();
                }else{
                    styleString += args[i];
                }
                if(i !== args.length - 1){
                    styleString += ', ';
                }
            }
            styleString += ')';
            return styleString;
        }else{
            return null;
        }
    }
    let Color = function(r, g, b, a){
        r /= 255;
        g /= 255;
        b /= 255;
        let max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        if(max === min){
            h = s = 0; // achromatic
        }else{
            let d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch(max){
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        this.h = h;
        this.s = s;
        this.l = l;
        if(a === undefined){
            this.a = 1;
        }else{
            this.a = a;
        }
    };
    Color.fromRGBString = function(rawColor){
        if(rawColor[3] === 'a'){
            let colors = rawColor.slice(5, -1).split(', ');
            return new Color(Number(colors[0]), Number(colors[1]), Number(colors[2]), Number(colors[3]));
        }else{
            let colors = rawColor.slice(4, -1).split(', ');
            return new Color(Number(colors[0]), Number(colors[1]), Number(colors[2]), 1);
        }
    };
    Color.prototype.stringify = function(){
        return 'hsla(' + Number(this.h * 360).toFixed(2) + ', ' + Number(this.s * 100).toFixed(2) + '%, ' + Number(this.l * 100).toFixed(2) + '%, ' + this.a + ')';
    };
    Color.prototype.isTransparent = function(){
        return this.a === 0;
    };
    Color.prototype.isTranslucent = function(){
        return this.a < 1;
    };
}());
