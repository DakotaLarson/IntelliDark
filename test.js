(function(){
    const debug = true;
    function initObservations(fn){
        let options = {childList: true};
        let initialStyleInserted = false;
        let bodyObserved = false;

        let observer = new MutationObserver(function(){
            if(!initialStyleInserted && document.head){
                initialStyleInserted = true;
                insertInitialStyle();
                if(bodyObserved){
                    removeListeners();
                }
            }
            if(document.body){
                bodyObserved = true;
                observeBody();
                if(initialStyleInserted){
                    removeListeners();
                }
            }
        });

        observer.observe(document.documentElement, options);
        window.addEventListener('DOMContentLoaded', handleDOMContentLoaded);

        function handleDOMContentLoaded(){
            observer.disconnect();
            if(!initialStyleInserted){
                insertInitialStyle();
            }if(!bodyObserved){
                observeBody();
            }
            removeListeners();
        }
        function insertInitialStyle(){
            let styleElt = document.createElement('style');
            styleElt.type = 'text/css';
            styleElt.id = 'intellidarkstyle';
            document.head.appendChild(styleElt);
            let sheet = styleElt.sheet;
            let htmlRule = 'html{background-color: #000 !important; filter: invert(100%) hue-rotate(180deg) !important;}';
            let contraryRule = 'img, video, canvas, iframe, svg image{filter: invert(100%) hue-rotate(180deg) !important;}';
            sheet.insertRule('@media only screen {' + htmlRule + contraryRule + '}', 0);
        }
        function removeListeners(){
            observer.disconnect();
            window.removeEventListener('DOMContentLoaded', handleDOMContentLoaded);
        }
    }
    function observeBody(){
        log('body being observed');
        let options = {
            childList: true,
            attributes: true,
            subtree: true
        };
        let observer = new MutationObserver(function(mutations){
            log(mutations.length);
        });
        observer.observe(document.body, options);
        fastdom.mutate(function(){
             log('test');
             log(hashCode('test'));
             log(hashCode(String(document.body)));
        })
    }
    function removeInitialStyle(){
        document.head.querySelector('#intellidarkstyle').sheet.disabled = true;
    }
    initObservations(function(){

    });
    function log(data){
        if(debug && window.self === window.top){
            console.log(data);
        }
    }
    function hashCode(str){
        let hash = 0;
        for(let i = 0; i < str.length; i++) {
            let character = str.charCodeAt(i);
            hash = ((hash<<5)-hash)+character;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash;
        //compareDocumentPosition
        //https://www.w3.org/TR/AERT/#color-contrast
        //http://www.nbdtech.com/Blog/archive/2008/04/27/Calculating-the-Perceived-Brightness-of-a-Color.aspx
    }
})();
