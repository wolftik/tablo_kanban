const NEWTAB = chrome.runtime.getURL('views/newtab.html');

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: NEWTAB });
});

chrome.runtime.onInstalled.addListener(() => {
  const title = chrome.i18n.getMessage('settingsOpen');
  chrome.action.setTitle({ title: 'Tablo Kanban — ' + title });
});

// Proxy cross-origin requests that are blocked by CORS in extension pages.
// Service workers are not subject to web CORS policy.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'fetchQuote') {
    fetch('https://zenquotes.io/api/random')
      .then(r => {
        if (!r.ok) return sendResponse({ ok: false, error: 'Status ' + r.status });
        return r.json().then(data => sendResponse({ ok: true, data }));
      })
      .catch(e => sendResponse({ ok: false, error: e.message }));
    return true; // keep channel open for async sendResponse
  }
});
