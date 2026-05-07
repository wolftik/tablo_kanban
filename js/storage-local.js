'use strict';

const StorageLocal = (() => {
  const PREFIX = 'kanban_';

  async function get(key) {
    try {
      const val = localStorage.getItem(PREFIX + key);
      return val ? JSON.parse(val) : undefined;
    } catch (e) {
      console.error('StorageLocal.get failed:', e);
      return undefined;
    }
  }

  async function set(key, value, onError) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('StorageLocal.set failed:', e);
      if (onError) onError(e);
      return false;
    }
  }

  async function remove(key) {
    try {
      localStorage.removeItem(PREFIX + key);
      return true;
    } catch (e) {
      console.error('StorageLocal.remove failed:', e);
      return false;
    }
  }

  function getStorageInfo() {
    let used = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(PREFIX)) {
        used += (localStorage.getItem(key) || '').length;
      }
    }
    const quota = 5 * 1024 * 1024;
    return { used, free: quota - used, quota };
  }

  function clear() {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }

  return { get, set, remove, getStorageInfo, clear };
})();
