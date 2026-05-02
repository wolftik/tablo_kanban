'use strict';

const SyncProvider = (() => {
  const STORAGE_KEY = 'sync_provider';

  function _getProviderName() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(STORAGE_KEY, (data) => {
        resolve(data[STORAGE_KEY] || 'google_drive');
      });
    });
  }

  function _setProviderName(name) {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ [STORAGE_KEY]: name }, resolve);
    });
  }

  function _resolve(providerName) {
    if (providerName === 'yandex_disk') {
      return YadiskSync;
    }
    return DriveSync;
  }

  async function getProvider() {
    const name = await _getProviderName();
    return { name, impl: _resolve(name) };
  }

  async function setProvider(name) {
    await _setProviderName(name);
  }

  async function isSignedIn() {
    const provider = await getProvider();
    return provider.impl.isSignedIn();
  }

  async function signIn() {
    const provider = await getProvider();
    return provider.impl.signIn();
  }

  async function signOut() {
    const provider = await getProvider();
    return provider.impl.signOut();
  }

  async function upload(data) {
    const provider = await getProvider();
    return provider.impl.upload(data);
  }

  async function download() {
    const provider = await getProvider();
    return provider.impl.download();
  }

  async function getLastModified() {
    const provider = await getProvider();
    return provider.impl.getLastModified();
  }

  return { getProvider, setProvider, isSignedIn, signIn, signOut, upload, download, getLastModified };
})();
