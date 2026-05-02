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

  async function _request(url, options = {}) {
    const token = await _getToken();
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: 'OAuth ' + token,
        ...(options.headers || {})
      }
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error('Yandex Disk API error ' + res.status + ': ' + text);
    }
    return res.json();
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

  async function isSignedIn() {
    try {
      await _getToken();
      return true;
    } catch {
      return false;
    }
  }

  async function signOut() {
    await removeToken();
  }

  async function _ensureFolder() {
    try {
      await _request(BASE_URL + '/resources?path=app:/tablo_kanban', { method: 'GET' });
    } catch {
      await _request(BASE_URL + '/resources?path=app:/tablo_kanban', { method: 'PUT' });
    }
  }

  async function upload(data) {
    await _ensureFolder();
    const uploadUrl = await _getUploadUrl();
    const res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error('Yandex Disk upload error ' + res.status + ': ' + text);
    }
  }

  async function _getUploadUrl() {
    const result = await _request(BASE_URL + '/resources/upload?path=app:/tablo_kanban/' + FILE_NAME + '&overwrite=true');
    return result.href;
  }

  async function _getDownloadUrl() {
    const result = await _request(BASE_URL + '/resources/download?path=app:/tablo_kanban/' + FILE_NAME);
    return result.href;
  }

  async function download() {
    const downloadUrl = await _getDownloadUrl();
    const token = await _getToken();
    const res = await fetch(downloadUrl, {
      headers: { Authorization: 'OAuth ' + token }
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error('Yandex Disk download error ' + res.status + ': ' + text);
    }
    return res.json();
  }

  async function getLastModified() {
    try {
      const result = await _request(BASE_URL + '/resources?path=app:/tablo_kanban/' + FILE_NAME + '&fields=modified');
      return new Date(result.modified).getTime();
    } catch {
      return 0;
    }
  }

  return { isSignedIn, signOut, upload, download, getLastModified, setToken, removeToken };
})();
