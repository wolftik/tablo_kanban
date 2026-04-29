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
    if (!this._displayedBookmarks.find(b => b && b.url === url)) {
      const newBookmark = { id: Storage.generateId(), url, title: title || url };
      if (position !== null && position >= 0 && position < 22 && !this._displayedBookmarks[position]) {
        this._displayedBookmarks[position] = newBookmark;
      } else {
        // Найти первый пустой слот
        let emptyIndex = this._displayedBookmarks.indexOf(null);
        if (emptyIndex === -1) emptyIndex = this._displayedBookmarks.length;
        this._displayedBookmarks[emptyIndex] = newBookmark;
      }
      await this.saveDisplayedBookmarks(this._displayedBookmarks);
    }
    return this._displayedBookmarks;
  },

  async removeDisplayedBookmark(id) {
    const index = this._displayedBookmarks.findIndex(b => b && b.id === id);
    if (index !== -1) {
      this._displayedBookmarks[index] = null;
      await this.saveDisplayedBookmarks(this._displayedBookmarks);
    }
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
    const TOTAL_SLOTS = 22;

    // Создаём карту позиций: индекс слота -> закладка
    const bookmarkMap = new Map();
    for (let i = 0; i < bookmarks.length; i++) {
      if (bookmarks[i] !== null && bookmarks[i] !== undefined) {
        bookmarkMap.set(i, bookmarks[i]);
      }
    }

    for (let i = 0; i < TOTAL_SLOTS; i++) {
      if (bookmarkMap.has(i)) {
        const bm = bookmarkMap.get(i);
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
      } else {
        const placeholder = document.createElement('div');
        placeholder.className = 'bookmark-placeholder';
        placeholder.dataset.index = i;
        placeholder.innerHTML = `
          <span class="placeholder-icon">⁂</span>
          <span>Добавить сайт</span>
        `;
        placeholder.addEventListener('click', () => {
          const modal = document.getElementById('add-bookmark-modal');
          const urlInput = document.getElementById('bookmark-url');
          if (modal && urlInput) {
            container.querySelectorAll('.bookmark-placeholder.active').forEach(p => p.classList.remove('active'));
            placeholder.classList.add('active');
            modal.dataset.targetIndex = placeholder.dataset.index;
            modal.style.display = 'flex';
            urlInput.focus();
          }
        });
        container.appendChild(placeholder);
      }
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

      const targetSlot = this._getSlotFromCoordinates(container, e.clientX, e.clientY);
      
      container.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
      if (targetSlot !== null) {
        const slotEl = container.children[targetSlot];
        if (slotEl) {
          slotEl.classList.add('drag-over');
        }
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
      const targetSlot = this._getSlotFromCoordinates(container, e.clientX, e.clientY);

      // Переместить DOM-элемент в целевой слот
      if (targetSlot !== null && targetSlot < container.children.length) {
        const targetEl = container.children[targetSlot];
        if (targetEl !== dragging) {
          container.insertBefore(dragging, targetEl);
        }
      } else {
        container.appendChild(dragging);
      }

      // Формировать newOrder из обновленного DOM с сохранением позиций
      const newOrder = [];
      const items = container.querySelectorAll('.bookmark-item');
      items.forEach(item => {
        newOrder.push({
          id: item.dataset.bookmarkId,
          url: item.href,
          title: item.querySelector('.bookmark-title').textContent
        });
      });

      // Восстанавливаем sparse-массив с правильными индексами
      const sparseArray = new Array(22).fill(null);
      items.forEach((item, domIndex) => {
        const bm = newOrder.find(b => b.id === item.dataset.bookmarkId);
        if (bm) {
          sparseArray[domIndex] = bm;
        }
      });

      await this.saveDisplayedBookmarks(sparseArray);
      this._displayedBookmarks = sparseArray;
      this.renderBookmarks(container, this._displayedBookmarks);
      
      container.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    });
  },

  _getSlotFromCoordinates(container, x, y) {
    const gridStyle = container.style;
    const colsMatch = gridStyle.getPropertyValue('grid-template-columns');
    const rowsMatch = gridStyle.getPropertyValue('grid-template-rows');
    
    const colDefs = colsMatch ? colsMatch.trim().split(/\s+/) : [];
    const rowDefs = rowsMatch ? rowsMatch.trim().split(/\s+/) : [];
    
    const colWidth = colDefs.length > 0 ? parseInt(colDefs[0]) + 8 : 128;
    const rowHeight = rowDefs.length > 0 ? parseInt(rowDefs[0]) + 8 : 108;
    
    const rect = container.getBoundingClientRect();
    const relX = x - rect.left;
    const relY = y - rect.top;
    
    const colIndex = Math.floor(relX / colWidth);
    const rowIndex = Math.floor(relY / rowHeight);
    
    const totalCols = colDefs.length || 11;
    
    if (rowIndex < 0 || colIndex < 0) return null;
    
    const slot = rowIndex * totalCols + colIndex;
    return slot;
  },


  async render() {
    const container = document.getElementById('bookmarks-container');
    if (!container) return;

    await this.loadDisplayedBookmarks();

    const settings = await Storage.get('settings') || Storage.getDefaultSettings();
    const visibleIds = settings.visibleBookmarks || [];

    // Создаём карту позиций для пользовательских закладок
    const bookmarksToRender = [];
    for (let i = 0; i < 22; i++) {
      bookmarksToRender[i] = this._displayedBookmarks[i] || null;
    }

    // Заполняем пустые слоты Chrome-закладками
    if (visibleIds.length > 0 && typeof chrome !== 'undefined' && chrome.bookmarks) {
      const folders = await this.getAllChromeBookmarks();
      const allBookmarks = this.flattenBookmarks(folders);
      const visibleBookmarks = allBookmarks.filter(bm => visibleIds.includes(bm.id));

      let vi = 0;
      for (let i = 0; i < 22; i++) {
        if (bookmarksToRender[i] === null && vi < visibleBookmarks.length) {
          bookmarksToRender[i] = visibleBookmarks[vi++];
        }
      }
    }

    // Передаём полный массив с null-слотами
    this.renderBookmarks(container, bookmarksToRender);
  }
};
