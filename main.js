(function(){
    const ignoredNodes = ['STYLE', 'SCRIPT', 'NOSCRIPT', 'IMG', 'VIDEO', 'CANVAS', 'IFRAME'];
    const styles = ['border-left-color', 'border-top-color', 'border-right-color', 'border-bottom-color', 'caret-color', 'outline-color', 'text-decoration-color', 'color'];
    const lightnessThreshold = 0.5;
    console.log(location.href);
    document.documentElement.setAttribute('intellidark', 'false');
    observeStyleSheets(function(){
        console.log('stylesheets loaded');
    });
    window.addEventListener("load", function() {
        console.log('Load Event');
        getNodeCount();
        let time = performance.now();
        updateElement(document.body, false, function(eltCount){
            time = Math.round(performance.now() - time);
            console.log('IntelliDark Update Complete (' + eltCount + ' nodes | ' + time + 'ms)');
            observeMutations();
        });
    });
    function getNodeCount(){
        let time = performance.now();
        let count = document.getElementsByTagName('*').length;
        time = Math.round(performance.now() - time);
        console.log(count + ' nodes | ' + time + 'ms');
        return count;
    }
    function updateElement(element, parentStatus, fn){
        let eltCount = 1;
        if(element.nodeName === '#text'){
            fn(0);
            return;
        }
        let childCount = element.children.length;
        let updatedChildCount = 0;
        let updateChildren = true;
        //parentStatus = parent rendered "normally"; No JavaScript Manipulations
        let status = parentStatus;
        let mutations = {};
        if(ignoredNodes.indexOf(element.nodeName) === -1){
            fastdom.measure(function(){
                let style = window.getComputedStyle(element, null);
                if(style.backgroundImage !== 'none'){
                    let backgroundImage = style.backgroundImage;
                    if(backgroundImage.startsWith('url')){
                        updateChildren = false;
                        handleImage(backgroundImage, style, childCount, function(imageStatus, url){
                            if(imageStatus === 0){
                                status = changeColors(element, style, status, mutations);
                            }else if(imageStatus === 2){
                                mutations['background-image'] = 'url(' + url + ')';
                                status = false;
                            }else{
                                status = true;
                            }
                            if(element.hasAttribute('intellidark') && element.getAttribute('intellidark') === String(status)){
                                //Element updated before; current update has no changes; Do not continue.
                                fn(eltCount);
                            }else{
                                element.setAttribute('intellidark', String(status));
                                let styleStr = stringifyMutations(mutations);
                                fastdom.mutate(function(){
                                   element.style.cssText += styleStr;
                                });
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
                        let newBG = handleGradient(backgroundImage);
                        if(newBG !== null){
                            mutations['background-image'] = newBG;
                            darkenBackgroundColor(element, style, mutations);
                            lightenColorStyles(element, style, mutations);
                            status = false;
                        }else{
                            status = true;
                        }
                    }
                }else{
                    status = changeColors(element, style, status, mutations);
                }
                if(updateChildren){
                    if(element.hasAttribute('intellidark') && element.getAttribute('intellidark') === String(status)){
                        //Element updated before; current update has no changes; Do not continue.
                        fn(eltCount);
                    }else{
                        element.setAttribute('intellidark', String(status));
                        let styleStr = stringifyMutations(mutations);
                        fastdom.mutate(function(){
                            element.style.cssText += styleStr;
                        });
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
            });
        }else{
            updatedChildCount ++;
        }
    }
    function changeColors(element, style, status, mutations){
        let bgStatus = darkenBackgroundColor(element, style, mutations);
        if((bgStatus === 0 && !status) || bgStatus === 2){
            lightenColorStyles(element, style, mutations);
            return false;
        }else{
            return true;
        }

    }
    function darkenBackgroundColor(element, rawStyle, mutations){
        let color = Color.fromRGBString(rawStyle.backgroundColor);
        if(!color.isTransparent()) {
            //Element has a background color.
            if (color.l >= lightnessThreshold) {
                color.l = 1 - color.l;
                mutations['background-color'] = color.stringify();
                return 2;
            }else{
                return 1;
            }
        }
        return 0;
    }
    function lightenColorStyles(element, rawStyle, mutations){
        if(rawStyle.boxShadow !== 'none'){
            let newStr = handleShadow(rawStyle.boxShadow, false);
            if(newStr){
                mutations['box-shadow'] = newStr;
            }
        }
        if(rawStyle.textShadow !== 'none'){
            let newStr = handleShadow(rawStyle.textShadow, true);
            if(newStr){
                mutations['text-shadow'] = newStr;
            }
        }
        for(let i = 0; i < styles.length; i ++){
            let style = rawStyle.getPropertyValue(styles[i]);
            if(style){
                let color = Color.fromRGBString(style);
                if(color.l < 1 - lightnessThreshold){
                    color.l = 1 - color.l;
                    mutations[styles[i]] = color.stringify();
                }
            }
        }
    }
    function stringifyMutations(mutations){
        let str = '';
        let keys = Object.keys(mutations);
        for(let i = 0; i < keys.length; i ++){
            str += keys[i] + ': ' + mutations[keys[i]] + ' !important; ';
        }
        return str;
    }
    /*fn returns  isting parent)
    status 1 = variant image (no change, children render with "normal" parent)
    status 2 = non-variant image (image inverted, children render with "modified" parent)

     */
    function handleImage(rawUrl, style, childCount, fn){
        let rawXPos = style.backgroundPositionX;
        let rawYPos = style.backgroundPositionY;
        let rawWidth = style.width;
        let rawHeight = style.height;
        //handle backgroundSize size somehow
        let xPos = rawXPos.endsWith('px') ? Math.min(parseInt(rawXPos), 0) * -1 : 0;
        let yPos = rawYPos.endsWith('px') ? Math.min(parseInt(rawYPos), 0) * -1 : 0;
        let width = rawWidth.endsWith('px') ? parseInt(rawWidth) : 0;
        let height = rawHeight.endsWith('px') ? parseInt(rawHeight) : 0;
        if(!width || !height){
            fn(1);
            return;
        }
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
    function handleGradient(str){
        return handleMultipartCSS(str, true);
    }
    function handleShadow(str, darken){
        return handleMultipartCSS(str, darken);
    }
    function handleMultipartCSS(str, darken){
        let colors = [];
        let strings = [];
        let startIndex = str.indexOf('rgb');
        let endIndex = str.indexOf(')', startIndex) + 1;
        strings.push(str.slice(0, startIndex));
        let avgLight = 0;
        while(startIndex < str.length){
            let colorStart = startIndex;
            startIndex = str.indexOf('rgb', endIndex);
            if(startIndex === -1){
                let color = Color.fromRGBString(str.slice(colorStart, endIndex + 1));
                colors.push(color);
                avgLight += color.l;
                strings.push(str.slice(endIndex + 1));
                break;
            }else{
                let color = Color.fromRGBString(str.slice(colorStart, endIndex));
                colors.push(color);
                avgLight += color.l;
                strings.push(str.slice(endIndex, startIndex));
            }
            endIndex = str.indexOf(')', startIndex);
        }
        avgLight /= colors.length;
        let bool = avgLight < lightnessThreshold;
        if(darken){
            bool = avgLight > lightnessThreshold;
        }
        if(bool){
            let finalStr = strings[0];
            for(let i = 0; i < colors.length; i ++){
                let color = colors[i];
                color.l = 1 - color.l;
                finalStr += color.stringify() + strings[i + 1];
            }
            return finalStr;
        }else{
            return null;
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
                if(mutation.type === 'attributes'){
                    if(mutation.target.parentElement.hasAttribute('intellidark')){
                        let status = mutation.target.parentElement.getAttribute('intellidark');
                        updateElement(mutation.target, status, function(eltCount){
                            //console.log('M-Attr: ' + eltCount + ' node(s) updated.');
                        });
                    }else{
                        console.warn('Parent doesn\'t have correct attribute');
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
        });
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
