'use strict';

const DriveSync = (() => {
  const FILE_NAME = 'kanban_data.json';
  const MIME_TYPE = 'application/json';

  function _getToken(interactive) {
    return new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive }, (token) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(token);
        }
      });
    });
  }

  function _accessToken() {
    return _getToken(true);
  }

  async function _request(url, options = {}) {
    const token = await _accessToken();
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: 'Bearer ' + token,
        ...(options.headers || {})
      }
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error('Drive API error ' + res.status + ': ' + text);
    }
    return res.json();
  }

  async function _findOrCreateFile() {
    const searchUrl = 'https://www.googleapis.com/drive/v3/files?q=' +
      encodeURIComponent("name='" + FILE_NAME + "' and mimeType='" + MIME_TYPE + "' and trashed=false") +
      '&fields=files(id,modifiedTime)';
    const result = await _request(searchUrl);
    if (result.files && result.files.length > 0) {
      const file = result.files[0];
      return { id: file.id, modifiedTime: file.modifiedTime };
    }

    const metadata = {
      name: FILE_NAME,
      mimeType: MIME_TYPE
    };
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob(['{}'], { type: MIME_TYPE }));

    const created = await _request('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,modifiedTime', {
      method: 'POST',
      body: form
    });
    return { id: created.id, modifiedTime: created.modifiedTime };
  }

  async function isSignedIn() {
    try {
      await _getToken(false);
      return true;
    } catch {
      return false;
    }
  }

  async function signIn() {
    return new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(!!token);
        }
      });
    });
  }

  async function signOut() {
    return new Promise((resolve) => {
      chrome.identity.clearAllCachedAuthTokens(() => {
        resolve();
      });
    });
  }

  async function upload(data) {
    const file = await _findOrCreateFile();
    await _request('https://www.googleapis.com/upload/drive/v3/files/' + file.id + '?uploadType=media', {
      method: 'PATCH',
      headers: { 'Content-Type': MIME_TYPE },
      body: JSON.stringify(data)
    });
  }

  async function download() {
    const file = await _findOrCreateFile();
    const token = await _accessToken();
    const res = await fetch('https://www.googleapis.com/drive/v3/files/' + file.id + '?alt=media', {
      headers: { Authorization: 'Bearer ' + token }
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error('Drive download error ' + res.status + ': ' + text);
    }
    return res.json();
  }

  async function getLastModified() {
    const searchUrl = 'https://www.googleapis.com/drive/v3/files?q=' +
      encodeURIComponent("name='" + FILE_NAME + "' and mimeType='" + MIME_TYPE + "' and trashed=false") +
      '&fields=files(id,modifiedTime)';
    const result = await _request(searchUrl);
    if (result.files && result.files.length > 0) {
      return new Date(result.files[0].modifiedTime).getTime();
    }
    return 0;
  }

  return { isSignedIn, signIn, signOut, upload, download, getLastModified };
})();
