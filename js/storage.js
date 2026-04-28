const Storage = {
  _useSync: typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync,

  async get(key) {
    if (this._useSync) {
      const result = await chrome.storage.sync.get(key);
      if (result[key] !== undefined) return result[key];
    }
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : undefined;
    } catch {
      return undefined;
    }
  },

  async set(key, value) {
    if (this._useSync) {
      await chrome.storage.sync.set({ [key]: value });
    }
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore
    }
  },

  async remove(key) {
    if (this._useSync) {
      await chrome.storage.sync.remove(key);
    }
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  },

  async getMultiple(keys) {
    if (this._useSync) {
      try {
        const result = await chrome.storage.sync.get(keys);
        return result;
      } catch {}
    }
    const result = {};
    for (const key of keys) {
      const val = localStorage.getItem(key);
      result[key] = val ? JSON.parse(val) : undefined;
    }
    return result;
  },

  async setMultiple(items) {
    if (this._useSync) {
      await chrome.storage.sync.set(items);
    }
    for (const [key, value] of Object.entries(items)) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {}
    }
  },

  getDefaultColumns() {
    return [
      { id: this.generateId(), title: 'Backlog', color: '#94a3b8', order: 0, cards: [] },
      { id: this.generateId(), title: 'To Do', color: '#6366f1', order: 1, cards: [] },
      { id: this.generateId(), title: 'In Progress', color: '#f59e0b', order: 2, cards: [] },
      { id: this.generateId(), title: 'Review', color: '#8b5cf6', order: 3, cards: [] },
      { id: this.generateId(), title: 'Done', color: '#22c55e', order: 4, cards: [] },
    ];
  },

  getDefaultTags() {
    return [
      { id: this.generateId(), name: 'Bug', color: '#ef4444' },
      { id: this.generateId(), name: 'Feature', color: '#3b82f6' },
      { id: this.generateId(), name: 'Enhancement', color: '#8b5cf6' },
    ];
  },

  getDefaultSettings() {
    return {
      theme: 'system',
      cardSize: 'standard',
      showFavicon: true,
      visibleBookmarks: [],
      tags: this.getDefaultTags(),
      kanbanFilter: {},
      columns: this.getDefaultColumns(),
    };
  },

  generateId() {
    return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
};
