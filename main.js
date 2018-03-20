(function(){
    const ignoredNodes = ['STYLE', 'SCRIPT', 'NOSCRIPT', 'IMG', 'VIDEO', 'CANVAS', 'IFRAME'];
    const styles = ['border-left-color', 'border-top-color', 'border-right-color', 'border-bottom-color', 'caret-color', 'outline-color', 'text-decoration-color', 'color'];
    const lightnessThreshold = 0.5;
    console.log(location.href);
    document.documentElement.setAttribute('intellidark', 'false');
    observeStyleSheets(function(){
        console.log('stylesheets loaded');
        handleMultipleGradients();
    });
    window.addEventListener("load", function() {
        console.log('load');
        let time = performance.now();
        updateElement(document.body, false, function(eltCount){
            time = Math.round(performance.now() - time);
            console.log('IntelliDark Update Complete (' + eltCount + ' nodes | ' + time + 'ms)');
            //observeMutations();
        });
    });
    function updateElement(element, parentStatus, fn){
        let eltCount = 1;
        let childCount = element.children.length;
        let updatedChildCount = 0;
        let updateChildren = true;
        //parentStatus = parent rendered "normally"; No JavaScript Manipulations
        let status = parentStatus;
        if(ignoredNodes.indexOf(element.nodeName) === -1){
            let style = window.getComputedStyle(element, null);
            if(style.backgroundImage !== 'none'){
                let backgroundImage = style.backgroundImage;
                if(backgroundImage.startsWith('url')){
                    updateChildren = false;
                    handleImage(backgroundImage, style, childCount, function(imageStatus, url){
                        if(imageStatus === 0){
                            if(darkenBackgroundColor(element, style) || !status){
                                lightenColorStyles(element, style);
                                status = false;
                            }else{
                                status = true;
                            }
                        }else if(imageStatus === 2){
                            element.style.setProperty('background-image', 'url(' + url + ')', 'important');
                            status = false;
                        }else{
                            status = true;
                        }
                        if(element.hasAttribute('intellidark') && element.getAttribute('intellidark') === String(status)){
                            //Element updated before; current update has no changes; Do not continue.
                            fn(eltCount);
                        }else{
                            element.setAttribute('intellidark', String(status));
                            if(childCount === 0){
                                fn(eltCount);
                            }else{
                                for(let i = 0; i < childCount; i ++){
                                    updateElement(element.children[i], status, function(childEltCount){
                                        eltCount += childEltCount;
                                        updatedChildCount ++;
                                        if(updatedChildCount === childCount){
                                            fn(eltCount);
                                        }
                                    });
                                }
                            }
                        }
                    });
                }else{
                    let newBG = handleBGGradient(backgroundImage);
                    if(newBG !== null){
                        element.style.setProperty('background-image', newBG, 'important');
                        lightenColorStyles(element, style);
                        status = false;
                    }else{
                        status = true;
                    }
                }
            }else{
                if(darkenBackgroundColor(element, style) || !status){
                    lightenColorStyles(element, style);
                    status = false;
                }else{
                    status = true;
                }
            }
        }else{
            updatedChildCount ++;
        }
        if(updateChildren){
            if(element.hasAttribute('intellidark') && element.getAttribute('intellidark') === String(status)){
                //Element updated before; current update has no changes; Do not continue.
                fn(eltCount);
            }else{
                element.setAttribute('intellidark', String(status));
                if(childCount === 0){
                    fn(eltCount);
                }else{
                    for(let i = 0; i < childCount; i ++){
                        updateElement(element.children[i], status, function(childEltCount){
                            eltCount += childEltCount;
                            updatedChildCount ++;
                            if(updatedChildCount === childCount){
                                fn(eltCount);
                            }
                        });
                    }
                }
            }
        }
    }
    function darkenBackgroundColor(element, rawStyle){
        let color = Color.fromRGBString(rawStyle.backgroundColor);
        if(!color.isTransparent()) {
            //Element has a background color.
            if (color.l >= lightnessThreshold) {
                color.l = 1 - color.l;
                element.style.setProperty('background-color', color.stringify(), 'important');
                return true;
            }
        }
        return false;
    }
    function lightenColorStyles(element, rawStyle){
        if(rawStyle.boxShadow !== 'none'){
            handleShadow(element, 'box-shadow', rawStyle, false);
        }
        if(rawStyle.textShadow !== 'none'){
            handleShadow(element, 'text-shadow', rawStyle, true);
        }
        for(let i = 0; i < styles.length; i ++){
            let style = rawStyle.getPropertyValue(styles[i]);
            if(style){
                let color = Color.fromRGBString(style);
                if(color.l < 1 - lightnessThreshold){
                    color.l = 1 - color.l;
                    element.style.setProperty(styles[i], color.stringify(), 'important');
                }
            }
        }
    }
    /*fn returns
    status 0 = transparent image (children render with existing parent)
    status 1 = variant image (no change, children render with "normal" parent)
    status 2 = non-variant image (image inverted, children render with "modified" parent)

     */
    function handleImage(rawUrl, style, childCount, fn){
        let rawXPos = style.backgroundPositionX;
        let rawYPos = style.backgroundPositionY;
        let rawWidth = style.width;
        let rawHeight = style.height;
        let size = style.backgroundSize;
        let xPos = rawXPos.endsWith('px') ? Math.min(parseInt(rawXPos), 0) * -1 : 0;
        let yPos = rawYPos.endsWith('px') ? Math.min(parseInt(rawYPos), 0) * -1 : 0;
        let width = rawWidth.endsWith('px') ? parseInt(rawWidth) : 0;
        let height = rawHeight.endsWith('px') ? parseInt(rawHeight) : 0;
        let imgUrl = rawUrl.slice(5, -2);
        let imgElt = new Image;
        imgElt.crossOrigin = 'anonymous';
        imgElt.src = imgUrl;
        imgElt.onload = function(){
            let canvasElt = document.createElement('canvas');
            canvasElt.height = imgElt.height;
            canvasElt.width = imgElt.width;
            let canvasCtx = canvasElt.getContext('2d');
            canvasCtx.drawImage(imgElt, xPos, yPos, width, height, 0, 0, width, height);
            let imgData = canvasCtx.getImageData(0, 0, width, height);
            let rAvg = 0;
            let gAvg = 0;
            let bAvg = 0;
            let transparency = 1;
            let pixelCount = 0;
            let totalPixelCount = (width - xPos) * (height - yPos);
            if(totalPixelCount > 0){
                //compute average
                for(let i = 0; i < totalPixelCount; i ++) {
                    if (imgData.data[4 * i + 3] > 0) {
                        rAvg += imgData.data[4 * i];
                        gAvg += imgData.data[4 * i + 1];
                        bAvg += imgData.data[4 * i + 2];
                        pixelCount++;
                    }
                }
                transparency = pixelCount/totalPixelCount;
                rAvg = Math.round(rAvg / pixelCount);
                gAvg = Math.round(gAvg / pixelCount);
                bAvg = Math.round(bAvg / pixelCount);
                let averageColor = new Color(rAvg, gAvg, bAvg, transparency);
                let variance = {};
                if(pixelCount === 0){
                    console.log(imgUrl);
                    //The image is transparent.
                    fn(0);
                }else{
                    //compute variance
                    let rVar = 0;
                    let gVar = 0;
                    let bVar = 0;
                    //compute average
                    for(let i = 0; i < totalPixelCount; i ++){
                        if (imgData.data[4 * i + 3] > 0) {
                            rVar += Math.pow(imgData.data[4 * i] - rAvg, 2);
                            gVar += Math.pow(imgData.data[4 * i + 1] - gAvg, 2);
                            bVar += Math.pow(imgData.data[4 * i + 2] - bAvg, 2);
                        }
                    }
                    variance.r = rVar / (pixelCount - 1);
                    variance.g = gVar / (pixelCount - 1);
                    variance.b = bVar / (pixelCount - 1);
                    let resultsObj = {
                        average: averageColor,
                        variance: variance,
                        total: pixelCount
                    };
                    //change to use "threshold" of sorts
                    if(variance.r === 0 && variance.g === 0 && variance.b === 0 && childCount === 0){
                        for(let i = 0; i < totalPixelCount; i ++){
                            if (imgData.data[4 * i + 3] > 0) {
                                let color = new Color(imgData.data[4 * i], imgData.data[4 * i + 1], imgData.data[4 * i + 2], imgData.data[4 * i + 3]);
                                color.l = 1 - color.l;
                                let newColor = color.toRGB();
                                imgData.data[4 * i] = newColor.r;
                                imgData.data[4 * i + 1] = newColor.g;
                                imgData.data[4 * i + 2] = newColor.b;
                                pixelCount++;
                            }
                        }
                        canvasCtx.putImageData(imgData, xPos, yPos);
                        let url = canvasElt.toDataURL();
                        fn(2, url);
                    }else{
                        fn(1);
                    }
                }
            }else{
                fn(0);
            }
        }
    }
    function handleBGGradient(backgroundImage){
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
                let color;
                let position = null;
                if(arg.endsWith(')')){
                    color = Color.fromRGBString(arg);
                }else{
                    let index = arg.indexOf(')') + 1;
                    color = Color.fromRGBString(arg.slice(0, index));
                    position = arg.slice(index + 1);
                }
                avgLight += color.l;
                colors[i] = {
                    color: color,
                    position: position
                };
            }
        }
        avgLight /= args.length;
        if(avgLight > lightnessThreshold){
            //The brightness is light on average; invert.
            for(let i in colors){
                let color =  colors[i].color;
                color.l = 1 - color.l;
            }
            let styleString = funcName + '(';
            for(let i = 0; i < args.length; i ++){
                if(colors.hasOwnProperty(i)){
                    styleString += colors[i].color.stringify();
                    if(colors[i].position !== null){
                        styleString += ' ' + colors[i].position;
                    }
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
    function handleShadow(element, name, style, darken){
        let shadow = style.getPropertyValue(name);
        let index = 0;
        let funcSections = [];
        while(index < shadow.length){
            index = shadow.indexOf('(', index);
            if(index === -1) break;
            funcSections.push([index]);
            index = shadow.indexOf(')', index);
            funcSections[funcSections.length - 1].push(index);
        }
        index = 0;
        let lastArgIndex = 0;
        let args = [];

        mainLoop: while(index < shadow.length) {
            index = shadow.indexOf(' ', index);
            if(index === -1){
                args.push(shadow.slice(lastArgIndex).trim());
                break;
            }
            for (let i = 0; i < funcSections.length; i++) {
                if (index > funcSections[i][0] && index < funcSections[i][1]){
                    index ++;
                    continue mainLoop;
                }
            }
            args.push(shadow.slice(lastArgIndex, index).trim());
            lastArgIndex = index + 1;
            index ++;
        }
        let colors = {};
        let avgLightness = 0;
        let colorCount = 0;
        for(let i = 0; i < args.length; i ++){
            if(args[i].startsWith('rgb')){
                let color = Color.fromRGBString(args[i]);
                avgLightness += color.l;
                colorCount ++;
                colors[i] = color;
            }
        }
        avgLightness /= colorCount;
        let bool = avgLightness < lightnessThreshold;
        if(darken){
            bool = avgLightness > lightnessThreshold;
        }
        if(bool){
            let newShadow = '';
            for(let i = 0; i < args.length; i ++){
                if(colors.hasOwnProperty(i)){
                    colors[i].l = 1 - colors[i].l;
                    newShadow += colors[i].stringify();
                }else{
                    newShadow += args[i];
                }
                if(i !== args.length - 1){
                    newShadow += ' ';
                }
            }
            element.style.setProperty('box-shadow', newShadow, 'important')
        }
    }
    function observeMutations(){
        let options = {
            childList: true,
            attributes: true,
            subtree: true
        };
        let observer = new MutationObserver(function(mutations){
            for(let i = 0; i < mutations.length; i ++){
                let mutation = mutations[i];
                console.log(mutation.type);
                if(mutation.type === 'attributes'){
                    if(mutation.target.parentElement.hasAttribute('intellidark')){
                        let status = mutation.target.parentElement.getAttribute('intellidark');
                        updateElement(mutation.target, status, function(eltCount){
                            //console.log('M-Attr: ' + eltCount + ' node(s) updated.');
                        });
                    }else{
                        console.warn('Element parent doesn\'t have correct attribute');
                        console.warn(mutation.target.parentElement);
                    }
                }else if(mutation.type === 'childList'){
                    if(mutation.target.hasAttribute('intellidark')){
                        let status = mutation.target.getAttribute('intellidark');
                        let eltTotal = 0;
                        let eltUpdateTotal = 0;
                        let eltCount = mutation.addedNodes.length;
                        for(let i = 0; i < eltCount; i ++){
                            updateElement(mutation.addedNodes[i], status, function(eltCount){
                                eltUpdateTotal += eltCount;
                                eltTotal ++;
                                if(eltTotal === eltCount){
                                    //console.log('M-ChLi: ' + eltUpdateTotal + ' node(s) updated.');
                                }
                            });
                        }
                    }else{
                        console.warn('Element doesn\'t have correct attribute');
                    }
                }
            }
        });
        observer.observe(document.body, options);
    }
    function observeStyleSheets(fn){
        let options = {
            childList: true,
            subtree: true,
        };
        let linkCount = 0;
        let loadedLinkCount = 0;
        let domLoaded = false;
        let observer = new MutationObserver(function(mutations){
            for(let i = 0; i < mutations.length; i ++){
                let mutation = mutations[i];
                for(let i = 0; i < mutation.addedNodes.length; i ++){
                    let node = mutation.addedNodes[i];
                    let name = node.nodeName;
                    if(name === 'LINK'){
                        if(node.rel && node.rel === 'stylesheet'){
                            linkCount ++;
                            node.addEventListener('load', function(){
                                loadedLinkCount ++;
                                if(domLoaded && loadedLinkCount >= linkCount){
                                    observer.disconnect();
                                    fn();
                                }
                            });
                        }
                    }
                }
            }
        });
        observer.observe(document.documentElement, options);
        window.addEventListener('DOMContentLoaded', function(){
            domLoaded = true;
            if(loadedLinkCount >= linkCount){
                observer.disconnect();
                fn();
            }
            console.log('DCL: ' + loadedLinkCount + '/' + linkCount + ' external stylesheets.');
        });
    }
    function handleMultipleGradients(str){
        str = "linear-gradient(rgb(255, 255, 255), rgb(153, 153, 153))";
        let colors = [];
        let strings = [];
        let startIndex = str.indexOf('rgb');
        let endIndex = str.indexOf(')', startIndex) + 1;
        strings.push(str.slice(0, startIndex));
        let avgLight = 0;
        while(startIndex < str.length){
            let color = Color.fromRGBString(str.slice(startIndex, endIndex));
            colors.push(color);
            avgLight += color.l;
            startIndex = str.indexOf('rgb', endIndex);
            if(startIndex === -1){
                strings.push(str.slice(endIndex + 1));
                break;
            }else{
                strings.push(str.slice(endIndex + 1, startIndex));
            }
            endIndex = str.indexOf(')', startIndex);
        }
        avgLight /= colors.length;
        if(avgLight > lightnessThreshold){
            for(let i = 0; i < colors.length; i ++){
                let color = colors[i];
                color.l = 1 - color.l;
            }
        }
        console.log(colors);
        console.log(strings);
        let finalStr = strings[0];
        for(let i = 0; i < colors.length; i ++){
            finalStr += colors[i].stringify() + strings[i + 1];
        }
        console.log(str);
        console.log(finalStr);
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
    Color.prototype.toRGB = function(){
        let r, g, b;
        if(this.s === 0){
            r = 1;
            g = 1;
            b = 1;
        }else{
            function hue2rgb(p, q, t){
                if(t < 0) t += 1;
                if(t > 1) t -= 1;
                if(t < 1/6) return p + (q - p) * 6 * t;
                if(t < 1/2) return q;
                if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            }

            let q = l < 0.5 ? l * (1 + this.s) : l + this.s - l * this.s;
            let  p = 2 * l - q;
            r = hue2rgb(p, q, this.h + 1/3);
            g = hue2rgb(p, q, this.h);
            b = hue2rgb(p, q, this.h - 1/3);
        }

        return {
            r: r * 255,
            g: g * 255,
            b: b * 255
        };
    }
}());
