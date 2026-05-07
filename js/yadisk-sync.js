'use strict';

const YadiskSync = (() => {
  const FILE_NAME = 'kanban_data.json';
  const BASE_URL = 'https://cloud-api.yandex.net/v1/disk';
  function _getToken() {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.get('yadisk_token', (data) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else if (data.yadisk_token) {
          resolve(data.yadisk_token);
        } else {
          reject(new Error('Yandex Disk token not found'));
        }
      });
    });
  }

  function setToken(token) {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ yadisk_token: token }, resolve);
    });
  }

  function removeToken() {
    return new Promise((resolve) => {
      chrome.storage.sync.remove('yadisk_token', resolve);
    });
  }

  function getClientId() {
    return new Promise((resolve) => {
      chrome.storage.sync.get('yadisk_client_id', (data) => {
        resolve(data.yadisk_client_id || '');
      });
    });
  }

  function setClientId(clientId) {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ yadisk_client_id: clientId }, resolve);
    });
  }

  async function isSignedIn() {
    try {
      await _getToken();
      return true;
    } catch {
      return false;
    }
  }

  async function signIn() {
    const clientId = await getClientId();
    if (!clientId) {
      throw new Error('client_id_not_set');
    }
    const authUrl = 'https://oauth.yandex.ru/authorize' +
      '?response_type=token' +
      '&client_id=' + clientId +
      '&redirect_uri=' + encodeURIComponent('https://oauth.yandex.ru/verification_code');
    chrome.tabs.create({ url: authUrl, active: true });
  }

  function _isAuthError(err) {
    return err && (err.message && (err.message.includes('401') || err.message.includes('Unauthorized')));
  }

  async function _request(url, options = {}) {
    const token = await _getToken();
    console.log('[YadiskSync] Request', options.method || 'GET', url);
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: 'OAuth ' + token,
        ...(options.headers || {})
      }
    });
    console.log('[YadiskSync] Response', res.status, res.statusText);
    if (!res.ok) {
      const text = await res.text();
      console.warn('[YadiskSync] Error body:', text);
      throw new Error('Yandex Disk API error ' + res.status + ': ' + text);
    }
    return res.json();
  }

  async function verifyToken() {
    try {
      await _getToken();
      await _request(BASE_URL + '/resources?path=app:/' + FILE_NAME + '&fields=modified');
      return { valid: true };
    } catch (err) {
      if (_isAuthError(err)) {
        return { valid: false, reason: 'token_expired' };
      }
      if (err.message && err.message.includes('404')) {
        return { valid: true };
      }
      return { valid: false, reason: 'network_error' };
    }
  }

  async function signOut() {
    await removeToken();
  }

  async function _getUploadUrl() {
    const result = await _request(BASE_URL + '/resources/upload?path=app:/' + FILE_NAME + '&overwrite=true');
    return result.href;
  }

  async function upload(data) {
    const uploadUrl = await _getUploadUrl();
    console.log('[YadiskSync] Uploading to', uploadUrl);
    const res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    console.log('[YadiskSync] Upload response', res.status);
    if (!res.ok) {
      const text = await res.text();
      console.warn('[YadiskSync] Upload error body:', text);
      throw new Error('Yandex Disk upload error ' + res.status + ': ' + text);
    }
  }

  async function _getDownloadUrl() {
    const result = await _request(BASE_URL + '/resources/download?path=app:/' + FILE_NAME);
    return result.href;
  }

  async function download() {
    try {
      const downloadUrl = await _getDownloadUrl();
      console.log('[YadiskSync] Downloading from', downloadUrl);
      const token = await _getToken();
      const res = await fetch(downloadUrl, {
        headers: { Authorization: 'OAuth ' + token }
      });
      console.log('[YadiskSync] Download response', res.status);
      if (!res.ok) {
        const text = await res.text();
        console.warn('[YadiskSync] Download error body:', text);
        throw new Error('Yandex Disk download error ' + res.status + ': ' + text);
      }
      return res.json();
    } catch (err) {
      if (err.message && err.message.includes('404')) {
        return null;
      }
      throw err;
    }
  }

  async function getLastModified() {
    try {
      const result = await _request(BASE_URL + '/resources?path=app:/' + FILE_NAME + '&fields=modified');
      return new Date(result.modified).getTime();
    } catch {
      return 0;
    }
  }

  return { isSignedIn, signIn, signOut, upload, download, getLastModified, setToken, removeToken, verifyToken, getClientId, setClientId };
})();
