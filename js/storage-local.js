'use strict';

const StorageLocal = (() => {
  const _useLocal = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;

  async function get(key) {
    if (_useLocal) {
      try {
        const result = await chrome.storage.local.get(key);
        if (result[key] !== undefined) return result[key];
      } catch {}
    }
    try {
      const val = localStorage.getItem('_local_' + key);
      return val ? JSON.parse(val) : undefined;
    } catch {
      return undefined;
    }
  }

  async function set(key, value) {
    if (_useLocal) {
      try {
        await chrome.storage.local.set({ [key]: value });
      } catch (e) {
        console.warn('StorageLocal.set (local) failed:', e);
      }
    }
    try {
      localStorage.setItem('_local_' + key, JSON.stringify(value));
    } catch {}
  }

  async function remove(key) {
    if (_useLocal) {
      try {
        await chrome.storage.local.remove(key);
      } catch {}
    }
    try {
      localStorage.removeItem('_local_' + key);
    } catch {}
  }

  return { get, set, remove };
})();
