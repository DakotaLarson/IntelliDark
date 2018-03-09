// // Copyright (c) 2014 The Chromium Authors. All rights reserved.
// // Use of this source code is governed by a BSD-style license that can be
// // found in the LICENSE file.
//
// /**
//  * Get the current URL.
//  *
//  * @param {function(string)} callback called when the URL of the current tab
//  *   is found.
//  */
// function getCurrentTabUrl(callback) {
//   let queryInfo = {
//     active: true,
//     currentWindow: true
//   };
//   chrome.tabs.query(queryInfo, (tabs) => {
//     let tab = tabs[0];
//     let url = tab.url;
//     callback(url);
//   });
// }
//
// /**
//  * Change the background color of the current page.
//  *
//  * @param {string} color The new background color.
//  */
// function changeBackgroundColor(color) {
//   let script = 'document.body.style.backgroundColor="' + color + '";';
//   chrome.tabs.executeScript({
//     code: script
//   });
// }
//
// /**
//  * Gets the saved background color for url.
//  *
//  * @param {string} url URL whose background color is to be retrieved.
//  * @param {function(string)} callback called with the saved background color for
//  *     the given url on success, or a falsy value if no color is retrieved.
//  */
// function getSavedBackgroundColor(url, callback) {
//   chrome.storage.sync.get(url, (items) => {
//     callback(chrome.runtime.lastError ? null : items[url]);
//   });
// }
//
// /**
//  * Sets the given background color for url.
//  *
//  * @param {string} url URL for which background color is to be saved.
//  * @param {string} color The background color to be saved.
//  */
// function saveBackgroundColor(url, color) {
//   let items = {};
//   items[url] = color;
//   chrome.storage.sync.set(items);
// }
//
// document.addEventListener('DOMContentLoaded', () => {
//   getCurrentTabUrl((url) => {
//     let dropdown = document.getElementById('dropdown');
//     getSavedBackgroundColor(url, (savedColor) => {
//       if (savedColor) {
//         changeBackgroundColor(savedColor);
//         dropdown.value = savedColor;
//       }
//     });
//
//     // Ensure the background color is changed and saved when the dropdown
//     // selection changes.
//     dropdown.addEventListener('change', () => {
//       changeBackgroundColor(dropdown.value);
//       saveBackgroundColor(url, dropdown.value);
//     });
//   });
// });
