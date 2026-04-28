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

  async addDisplayedBookmark(url, title, position = null) {
    if (!this._displayedBookmarks.find(b => b.url === url)) {
      const newBookmark = { id: Storage.generateId(), url, title: title || url };
      if (position !== null && position >= 0 && position <= this._displayedBookmarks.length) {
        this._displayedBookmarks.splice(position, 0, newBookmark);
      } else {
        this._displayedBookmarks.push(newBookmark);
      }
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
    const TOTAL_SLOTS = 24;

    for (const bm of bookmarks) {
      const a = document.createElement('a');
      a.className = 'bookmark-item';
      a.draggable = true;
      a.dataset.bookmarkId = bm.id;
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
      favicon.src = `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
      favicon.onerror = () => {
        favicon.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="%2394a3b8"/></svg>';
      };

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

    const remainingSlots = TOTAL_SLOTS - bookmarks.length;
    for (let i = 0; i < remainingSlots; i++) {
      const placeholder = document.createElement('div');
      placeholder.className = 'bookmark-placeholder';
      placeholder.dataset.index = bookmarks.length + i; // Позиция в сетке
      placeholder.innerHTML = `
        <span class="placeholder-icon">+</span>
        <span>Добавить сайт</span>
      `;
      placeholder.addEventListener('click', () => {
        const modal = document.getElementById('add-bookmark-modal');
        const urlInput = document.getElementById('bookmark-url');
        if (modal && urlInput) {
          // Убрать активный класс у других плейсхолдеров
          container.querySelectorAll('.bookmark-placeholder.active').forEach(p => p.classList.remove('active'));
          // Добавить активный класс текущему плейсхолдеру
          placeholder.classList.add('active');
          modal.dataset.targetIndex = placeholder.dataset.index; // Сохраняем позицию
          modal.style.display = 'flex';
          urlInput.focus();
        }
      });
      container.appendChild(placeholder);
    }

    this._bindBookmarkDragDrop(container);
  },

  _bindBookmarkDragDrop(container) {
    const bookmarkItems = container.querySelectorAll('.bookmark-item');

    bookmarkItems.forEach(item => {
      item.addEventListener('dragstart', (e) => {
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', item.dataset.bookmarkId);
      });

      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        container.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
      });
    });

    container.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';

      const afterElement = getBookmarkDragAfterElement(container, e.clientY);
      
      // Только визуальная подсветка, без изменения DOM
      container.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
      if (afterElement != null) {
        afterElement.classList.add('drag-over');
      }
    });

    container.addEventListener('dragleave', (e) => {
      if (!container.contains(e.relatedTarget)) {
        container.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
      }
    });

    container.addEventListener('drop', async (e) => {
      e.preventDefault();
      const dragging = container.querySelector('.bookmark-item.dragging');
      if (!dragging) return;

      const bookmarkId = dragging.dataset.bookmarkId;
      const afterElement = getBookmarkDragAfterElement(container, e.clientY);

      // Переместить элемент перед сохранением
      if (afterElement == null) {
        container.appendChild(dragging);
      } else {
        container.insertBefore(dragging, afterElement);
      }

      // Формировать newOrder из обновленного DOM
      const newOrder = [];
      const bookmarkItems = container.querySelectorAll('.bookmark-item');
      bookmarkItems.forEach(item => {
        newOrder.push({
          id: item.dataset.bookmarkId,
          url: item.href,
          title: item.querySelector('.bookmark-title').textContent
        });
      });

      await this.saveDisplayedBookmarks(newOrder);
      this._displayedBookmarks = newOrder;
      this.renderBookmarks(container, this._displayedBookmarks); // Немедленный рендер
      
      container.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    });
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
