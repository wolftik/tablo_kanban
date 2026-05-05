'use strict';

const SyncProvider = (() => {
  const STORAGE_KEY = 'sync_provider';

  async function _getProviderName() {
    try {
      const data = await chrome.storage.sync.get(STORAGE_KEY);
      return data[STORAGE_KEY] || 'google_drive';
    } catch {
      return 'google_drive';
    }
  }

  async function _setProviderName(name) {
    await chrome.storage.sync.set({ [STORAGE_KEY]: name });
  }

  function _resolve(providerName) {
    if (providerName === 'yandex_disk') {
      return YadiskSync;
    }
    try {
      if (!chrome.identity || !chrome.identity.getAuthToken) {
        return null;
      }
    } catch {
      return null;
    }
    return DriveSync;
  }

  async function getProvider() {
    const name = await _getProviderName();
    const impl = _resolve(name);
    if (!impl) {
      return { name, impl: null };
    }
    return { name, impl };
  }

  async function setProvider(name) {
    await _setProviderName(name);
  }

  async function isSignedIn() {
    const provider = await getProvider();
    return provider.impl ? provider.impl.isSignedIn() : false;
  }

  async function signIn() {
    const provider = await getProvider();
    if (!provider.impl) throw new Error('Sync provider not available in this browser');
    return provider.impl.signIn();
  }

  async function signOut() {
    const provider = await getProvider();
    if (!provider.impl) return;
    return provider.impl.signOut();
  }

  async function upload(data) {
    const provider = await getProvider();
    if (!provider.impl) throw new Error('Sync provider not available in this browser');
    return provider.impl.upload(data);
  }

  async function download() {
    const provider = await getProvider();
    if (!provider.impl) return null;
    return provider.impl.download();
  }

  async function getLastModified() {
    const provider = await getProvider();
    if (!provider.impl) return 0;
    return provider.impl.getLastModified();
  }

  return { getProvider, setProvider, isSignedIn, signIn, signOut, upload, download, getLastModified };
})();
