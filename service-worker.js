const NEWTAB = chrome.runtime.getURL('views/newtab.html');

function isNewTab(url) {
  return !url || url === 'chrome://newtab/' || url === 'about:blank' || url === 'about:newtab' || url === 'edge://newtab/';
}

// For Chrome/Edge: intercept new tab creation
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading' && isNewTab(tab.url)) {
    chrome.tabs.update(tabId, { url: NEWTAB }).catch(() => {});
  }
});

// For Yandex/others: open new tab on extension icon click
chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.create({ url: NEWTAB });
});

// Also set the new tab page on install so user sees the instruction
chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setTitle({ title: 'Tablo Kanban — Open new tab page' });
});
