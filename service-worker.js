const ALLOWED_FETCH_ORIGINS = [
  'https://query1.finance.yahoo.com/'
];

const NEWTAB = chrome.runtime.getURL('views/newtab.html');

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: NEWTAB });
});

chrome.runtime.onInstalled.addListener(() => {
  const title = chrome.i18n.getMessage('settingsOpen');
  chrome.action.setTitle({ title: 'Tablo Kanban — ' + title });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'FETCH_JSON') {
    const allowed = ALLOWED_FETCH_ORIGINS.some(origin => request.url.startsWith(origin));
    if (!allowed) {
      sendResponse({ ok: false, error: 'URL not allowed' });
      return;
    }
    fetch(request.url)
      .then(resp => {
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        return resp.json();
      })
      .then(data => sendResponse({ ok: true, data }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true;
  }
});
