const NEWTAB = chrome.runtime.getURL('views/newtab.html');

// Open on extension icon click
chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.create({ url: NEWTAB });
});

chrome.runtime.onInstalled.addListener(() => {
  const title = chrome.i18n.getMessage('settingsOpen');
  chrome.action.setTitle({ title: 'Tablo Kanban — ' + title });
});
