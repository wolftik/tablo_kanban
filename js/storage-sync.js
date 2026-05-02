'use strict';

const StorageSync = (() => {
  const _useSync = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync;

  async function get(key) {
    if (_useSync) {
      try {
        const result = await chrome.storage.sync.get(key);
        if (result[key] !== undefined) return result[key];
      } catch {}
    }
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : undefined;
    } catch {
      return undefined;
    }
  }

  async function set(key, value) {
    if (_useSync) {
      try {
        await chrome.storage.sync.set({ [key]: value });
      } catch (e) {
        console.warn('StorageSync.set (sync) failed:', e);
      }
    }
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }

  async function remove(key) {
    if (_useSync) {
      try {
        await chrome.storage.sync.remove(key);
      } catch {}
    }
    try {
      localStorage.removeItem(key);
    } catch {}
  }

  return { get, set, remove };
})();
