const NEWTAB = chrome.runtime.getURL('views/newtab.html');

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: NEWTAB });
});

chrome.runtime.onInstalled.addListener(() => {
  const title = chrome.i18n.getMessage('settingsOpen');
  chrome.action.setTitle({ title: 'Tablo Kanban — ' + title });
});
