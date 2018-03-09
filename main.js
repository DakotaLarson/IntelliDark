(function(){
    const ignoredNodes = ['STYLE', 'SCRIPT', 'NOSCRIPT'];
    const detailedNodes = ['IMG', 'VIDEO', 'CANVAS'];
    const inverstionThreshold = 192;
    console.log(location.href);
    window.addEventListener("load", function() {
        updateElement(document.body, true);
    });
    function getBackground(element){
        //console.log(element.nodeName);
        let style = window.getComputedStyle(element, null);
        let styleStr = '';
        if(style.backgroundColor !== 'rgba(0, 0, 0, 0)'){
            let color = parseColor(style.backgroundColor);
            console.log(isDark(color));
            styleStr += style.backgroundColor;
        }
        if(style.backgroundImage !== 'none'){
            styleStr += ' ' + style.backgroundImage;
        }
        let filterStyle = style.filter + ' ' + style.webkitFilter;
        if(styleStr.length !== 0){
            console.log(styleStr);
            console.log(element.nodeName);
        }
        if(filterStyle !== 'none none'){
            console.log(filterStyle);
        }
        for(let i = 0; i < element.children.length; i ++){
            getBackground(element.children[i]);
        }
    }
    function updateBody(){
        //console.log(window.getComputedStyle(document.documentElement, null).backgroundColor);
        let style = window.getComputedStyle(document.body, null);
        if(style.backgroundImage === 'none'){
            console.log(new Color(style.backgroundColor).getBrightness());
            let color = new Color(style.backgroundColor);
            if(color.isTransparent()){
            }else if(color.getBrightness() > inverstionThreshold){
                //document.body.style.backgroundColor = color.getInvertedColor().stringify();
            }
        }
        for(let i = 0; i < document.body.children.length; i ++){
            updateElement(document.body.children[i]);
        }
    }
    function updateElement(element, parentStatus){
        let status = parentStatus;
        //parent status = parent rendered "normally"
        if(ignoredNodes.indexOf(element.nodeName) === -1){
            if(detailedNodes.indexOf(element.nodeName) === -1){
                let style = window.getComputedStyle(element, null);
                if(style.backgroundImage.startsWith('url') && parentStatus){
                    console.log("We have a background image!");
                    element.style.setProperty('filter', 'invert(100%) hue-rotate(180deg)', 'important');
                    status = false;
                }else{
                    let color = new Color(style.backgroundColor);
                    if(!color.isTranslucent()){
                        let brightness = color.getBrightness();
                        if(brightness < 64 && parentStatus){
                            console.log("We have a dark element with a light parent!");
                            element.style.setProperty('filter', 'invert(100%) hue-rotate(180deg)', 'important');
                            status = false;
                        }else if(brightness > 192 && !parentStatus){
                            console.log("We have a light element with a dark parent!");
                            element.style.setProperty('filter', 'invert(100%) hue-rotate(180deg)', 'important');
                            status = true;

                        }
                    }
                }
            }else{
                if(!parentStatus){
                    console.log('We have a sensitive element with an inverted parent!');
                    element.style.setProperty('filter', 'none', 'important');
                    status = true;
                }
            }
        }
        for(let i = 0; i < element.children.length; i ++){
            updateElement(element.children[i], status);
        }
    }
    // function invertElement(element, style, backgroundColor){
    //     console.log(element.nodeName);
    //     let inverted = getInvertedColor(backgroundColor);
    //     element.style.backgroundColor = stringifyColor(inverted + ' !important');
    //     let styles = ['backgroundColor', 'borderLeftColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'caretColor', 'color', 'outlineColor', 'textDecorationColor'];
    //     for(let i = 0; i < styles.length; i ++){
    //         inverted = getInvertedColor(style.getPropertyValue(styles[i]));
    //         element.style.backgroundColor = 'black';
    //         element.style.setProperty(styles[i], stringifyColor(inverted), 'important');
    //     }
    // }
    function isBodyChild(target){
        if(target.nodeName === 'BODY'){
            return true;
        }else if(target.nodeName === 'HTML'){
            return false;
        }else{
            return isBodyChild(target.parentNode);
        }
    }
    function parseColor(rawColor){
        if(rawColor[3] === 'a'){
            let colors = rawColor.slice(5, -1).split(', ');
            return {
                r: Number(colors[0]),
                g: Number(colors[1]),
                b: Number(colors[2]),
                a: Number(colors[3])
            };
        }else{
            let colors = rawColor.slice(4, -1).split(', ');
            return {
                r: Number(colors[0]),
                g: Number(colors[1]),
                b: Number(colors[2])
            };
        }
    }
    let Color = function(rawColor, green, blue, alpha){
        if(typeof rawColor === 'string'){
            if(rawColor[3] === 'a'){
                let colors = rawColor.slice(5, -1).split(', ');
                this.r = Number(colors[0]);
                this.g = Number(colors[1]);
                this.b = Number(colors[2]);
                this.a = Number(colors[3]);
            }else{
                let colors = rawColor.slice(4, -1).split(', ');
                this.r = Number(colors[0]);
                this.g = Number(colors[1]);
                this.b = Number(colors[2]);
            }
        }else{
            this.r = rawColor;
            this.g = green;
            this.b = blue;
            if(alpha){
                this.a = alpha;
            }
        }
    };
    Color.prototype.stringify = function(){
        if(this.hasOwnProperty('a')){
            return 'rgba(' + this.r + ', ' + this.g + ', ' + this.b + ', ' + this.a + ')';
        }else{
            return 'rgb(' + this.r + ', ' + this.g + ', ' + this.b + ')';
        }
    };
    Color.prototype.getBrightness = function(){
        return (this.r * 299 + this.g * 587 + this.b * 114) / 1000;
    };
    Color.prototype.isTransparent = function(){
        return this.hasOwnProperty('a') && this.a === 0;
    };
    Color.prototype.isTranslucent = function(){
        return this.hasOwnProperty('a') && this.a < 1;
    };
    Color.prototype.getInvertedColor = function(){
        if(this.hasOwnProperty('a')){
            return new Color(255 - this.r, 255 - this.g, 255 - this.b, this.a);
        }
        return new Color(255 - this.r, 255 - this.g, 255 - this.b);
    };
}());
