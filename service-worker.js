const NEWTAB = chrome.runtime.getURL('views/newtab.html');

function isNewTab(url) {
  return !url || url === 'chrome://newtab/' || url === 'about:blank' || url === 'about:newtab' || url === 'edge://newtab/';
}

// For browsers without chrome_url_overrides support (Yandex, Edge)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading' && isNewTab(tab.url)) {
    chrome.tabs.update(tabId, { url: NEWTAB }).catch(() => {});
  }
});

// Open on extension icon click
chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.create({ url: NEWTAB });
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setTitle({ title: 'Tablo Kanban — Open new tab page' });
});
