chrome.browserAction.onClicked.addListener(function(){
    chrome.tabs.executeScript(null, {file: "main.js"});
    chrome.tabs.insertCSS(null, {file: "invert.css"});

});
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo,){
    console.log(changeInfo);
});
console.log('Background Initialized');
