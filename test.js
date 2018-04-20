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
        const ignoredNodes = ['#text', 'STYLE', 'SCRIPT', 'NOSCRIPT', 'IMG', 'VIDEO', 'CANVAS', 'IFRAME'];
        const hierarchy = [];
        const options = {
            childList: true,
            attributes: true,
            subtree: true
        };
        const observer = new MutationObserver(function(mutations){
            for(let i = 0; i < mutations.length; i ++){
                let mutation = mutations[i];
                if(mutation.type === 'childList'){
                    for(let i = 0; i < mutation.addedNodes.length; i ++){
                        handleMutation(mutation.addedNodes[i]);
                    }
                }else if(mutation.type === 'attributes'){
                    handleMutation(mutation.target);
                }
            }
        });
        observer.observe(document.body, options);
        fastdom.mutate(function(mutations){

             log('first mutation complete');
        });
        function handleMutation(element){
            if(ignoredNodes.indexOf(element.nodeName) === -1){
                for(let i = 0; i < hierarchy.length; i ++){
                    let position = element.compareDocumentPosition(hierarchy[i]);
                    if(position & Node.DOCUMENT_POSITION_CONTAINED_BY){
                        //element is the parent of the hierarchy element

                    }else if(position & Node.DOCUMENT_POSITION_CONTAINS){
                        //element is a child of the hierarchy element
                    }
                }
                log(element.compareDocumentPosition(document.body) & Node.DOCUMENT_POSITION_CONTAINS);
                //log(element.hasAttribute('intellidark-id'));
            }
        }
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
