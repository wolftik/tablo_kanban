const BookmarksManager = {
  _displayedBookmarks: [],
  _chromeBookmarks: [],

  async loadDisplayedBookmarks() {
    this._displayedBookmarks = await Storage.get('bookmarks_display') || [];
    return this._displayedBookmarks;
  },

  async saveDisplayedBookmarks(bookmarks) {
    this._displayedBookmarks = bookmarks;
    await Storage.set('bookmarks_display', bookmarks);
  },

  async addDisplayedBookmark(url, title) {
    if (!this._displayedBookmarks.find(b => b.url === url)) {
      this._displayedBookmarks.push({ id: Storage.generateId(), url, title: title || url });
      await this.saveDisplayedBookmarks(this._displayedBookmarks);
    }
    return this._displayedBookmarks;
  },

  async removeDisplayedBookmark(id) {
    this._displayedBookmarks = this._displayedBookmarks.filter(b => b.id !== id);
    await this.saveDisplayedBookmarks(this._displayedBookmarks);
    return this._displayedBookmarks;
  },

  getAllChromeBookmarks() {
    return new Promise((resolve, reject) => {
      if (typeof chrome === 'undefined' || !chrome.bookmarks) {
        resolve([]);
        return;
      }
      chrome.bookmarks.getTree((result) => {
        resolve(result);
      });
    });
  },

  flattenBookmarks(nodes, result = []) {
    for (const node of nodes) {
      if (node.url) {
        result.push({
          id: node.id,
          url: node.url,
          title: node.title || node.url,
          dateAdded: node.dateAdded,
        });
      }
      if (node.children) {
        this.flattenBookmarks(node.children, result);
      }
    }
    return result;
  },

  getAllFolders(nodes, result = []) {
    for (const node of nodes) {
      if (!node.url && node.title) {
        result.push({ id: node.id, title: node.title || 'Без названия', children: node.children || [] });
      }
      if (node.children) {
        this.getAllFolders(node.children, result);
      }
    }
    return result;
  },

  renderBookmarks(container, bookmarks) {
    container.innerHTML = '';

    for (const bm of bookmarks) {
      const a = document.createElement('a');
      a.className = 'bookmark-item';
      a.href = bm.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';

      const favicon = document.createElement('img');
      favicon.className = 'favicon';
      let hostname;
      try {
        hostname = new URL(bm.url).hostname;
      } catch {
        hostname = 'unknown';
      }
      favicon.src = `chrome://favicon/${hostname}`;
      favicon.onerror = () => { favicon.style.display = 'none'; };

      const titleEl = document.createElement('span');
      titleEl.className = 'bookmark-title';
      titleEl.textContent = bm.title;

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'bookmark-delete';
      deleteBtn.innerHTML = '&times;';
      deleteBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.removeDisplayedBookmark(bm.id).then(() => {
          this.renderBookmarks(container, this._displayedBookmarks);
        });
      });

      a.appendChild(favicon);
      a.appendChild(titleEl);
      a.appendChild(deleteBtn);
      container.appendChild(a);
    }
  },

  async render() {
    const container = document.getElementById('bookmarks-container');
    if (!container) return;

    await this.loadDisplayedBookmarks();

    const settings = await Storage.get('settings') || Storage.getDefaultSettings();
    const visibleIds = settings.visibleBookmarks || [];

    let bookmarksToRender = this._displayedBookmarks;

    if (visibleIds.length > 0 && typeof chrome !== 'undefined' && chrome.bookmarks) {
      const folders = await this.getAllChromeBookmarks();
      const allBookmarks = this.flattenBookmarks(folders);

      const visibleBookmarks = allBookmarks.filter(bm => visibleIds.includes(bm.id));
      bookmarksToRender = [...visibleBookmarks, ...this._displayedBookmarks.filter(dbm => !visibleIds.find(v => v === dbm.url))];
    }

    this.renderBookmarks(container, bookmarksToRender);
  }
};
