const BOOKMARK_SLOTS = 22;

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
      if (position !== null && position >= 0 && position < BOOKMARK_SLOTS && !this._displayedBookmarks[position]) {
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

    const bookmarkMap = new Map();
    for (let i = 0; i < bookmarks.length; i++) {
      if (bookmarks[i] !== null && bookmarks[i] !== undefined) {
        bookmarkMap.set(i, bookmarks[i]);
      }
    }

    for (let i = 0; i < BOOKMARK_SLOTS; i++) {
      const slot = document.createElement('div');
      slot.className = 'bookmark-slot';
      slot.draggable = true;
      slot.dataset.slotIndex = i;

      if (bookmarkMap.has(i)) {
        const bm = bookmarkMap.get(i);
        slot.classList.add('filled');
        slot.dataset.bookmarkId = bm.id;

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

        const menuBtn = document.createElement('button');
        menuBtn.className = 'bookmark-menu-btn';
        menuBtn.innerHTML = '&#8942;';
        menuBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.showContextMenu(e.clientX, e.clientY, bm, container);
        });

        slot.addEventListener('click', (e) => {
          if (e.target.closest('.bookmark-menu-btn')) return;
          window.open(bm.url, '_blank', 'noopener,noreferrer');
        });

        slot.appendChild(favicon);
        slot.appendChild(titleEl);
        slot.appendChild(menuBtn);
      } else {
        slot.classList.add('empty');
        slot.innerHTML = `
          <span class="placeholder-icon">⁂</span>
          <span class="placeholder-text">Добавить сайт</span>
        `;
        slot.addEventListener('click', (e) => {
          if (e.target.closest('.bookmark-menu-btn')) return;
          const modal = document.getElementById('add-bookmark-modal');
          const urlInput = document.getElementById('bookmark-url');
          if (modal && urlInput) {
            container.querySelectorAll('.bookmark-slot.empty.active').forEach(p => p.classList.remove('active'));
            slot.classList.add('active');
            modal.dataset.targetIndex = i;
            modal.style.display = 'flex';
            urlInput.focus();
          }
        });
      }

      container.appendChild(slot);
    }

    this._bindBookmarkDragDrop(container);
  },

  showContextMenu(x, y, bookmark, container) {
    let menu = document.getElementById('bookmark-context-menu');
    if (!menu) {
      menu = document.createElement('div');
      menu.id = 'bookmark-context-menu';
      menu.className = 'bookmark-context-menu';
      menu.innerHTML = `
        <button class="bookmark-context-menu-item edit">
          <span>&#9998;</span>
          <span>Редактировать</span>
        </button>
        <button class="bookmark-context-menu-item delete">
          <span>&#128465;</span>
          <span>Удалить</span>
        </button>
      `;
      document.body.appendChild(menu);
    }

    this._currentContextMenuBookmark = bookmark;
    this._currentContextMenuContainer = container;

    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.classList.add('show');

    const editBtn = menu.querySelector('.edit');
    const deleteBtn = menu.querySelector('.delete');

    editBtn.onclick = (e) => {
      e.stopPropagation();
      this.hideContextMenu();
      this.openEditModal(bookmark);
    };

    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      this.hideContextMenu();
      this.removeDisplayedBookmark(bookmark.id).then(() => {
        this.renderBookmarks(container, this._displayedBookmarks);
      });
    };

    this._closeMenuOnOutsideClick = (e) => {
      if (!menu.contains(e.target)) {
        this.hideContextMenu();
      }
    };

    setTimeout(() => {
      document.addEventListener('click', this._closeMenuOnOutsideClick);
    }, 100);
  },

  hideContextMenu() {
    const menu = document.getElementById('bookmark-context-menu');
    if (menu) {
      menu.classList.remove('show');
    }
    if (this._closeMenuOnOutsideClick) {
      document.removeEventListener('click', this._closeMenuOnOutsideClick);
      this._closeMenuOnOutsideClick = null;
    }
  },

  openEditModal(bookmark) {
    let modal = document.getElementById('bookmark-edit-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'bookmark-edit-modal';
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal">
          <h3>Редактировать закладку</h3>
          <input type="text" id="bookmark-edit-url" placeholder="URL">
          <input type="text" id="bookmark-edit-title" placeholder="Название">
          <div class="modal-actions">
            <button id="bookmark-edit-cancel">Отмена</button>
            <button id="bookmark-edit-save">Сохранить</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      const cancelBtn = modal.querySelector('#bookmark-edit-cancel');
      cancelBtn.onclick = () => {
        modal.style.display = 'none';
      };

      const saveBtn = modal.querySelector('#bookmark-edit-save');
      saveBtn.onclick = () => {
        const newUrl = document.getElementById('bookmark-edit-url').value;
        const newTitle = document.getElementById('bookmark-edit-title').value;
        if (newUrl && this._currentContextMenuBookmark) {
          const index = this._displayedBookmarks.findIndex(b => b && b.id === this._currentContextMenuBookmark.id);
          if (index !== -1) {
            this._displayedBookmarks[index] = {
              ...this._displayedBookmarks[index],
              url: newUrl,
              title: newTitle || newUrl
            };
            this.saveDisplayedBookmarks(this._displayedBookmarks).then(() => {
              this.renderBookmarks(this._currentContextMenuContainer, this._displayedBookmarks);
              modal.style.display = 'none';
            });
          }
        }
      };

      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.style.display = 'none';
        }
      });
    }

    document.getElementById('bookmark-edit-url').value = bookmark.url;
    document.getElementById('bookmark-edit-title').value = bookmark.title;
    modal.style.display = 'flex';
  },

  _bindBookmarkDragDrop(container) {
    let dragSourceIndex = null;

    container.addEventListener('dragstart', (e) => {
      const slot = e.target.closest('.bookmark-slot');
      if (!slot) return;
      dragSourceIndex = parseInt(slot.dataset.slotIndex);
      slot.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(dragSourceIndex));
    });

    container.addEventListener('dragend', () => {
      dragSourceIndex = null;
      container.querySelectorAll('.bookmark-slot.dragging').forEach(el => el.classList.remove('dragging'));
      container.querySelectorAll('.bookmark-slot.drag-over').forEach(el => el.classList.remove('drag-over'));
    });

    container.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';

      const targetSlot = this._getSlotFromCoordinates(container, e.clientX, e.clientY);

      container.querySelectorAll('.bookmark-slot.drag-over').forEach(el => el.classList.remove('drag-over'));
      if (targetSlot !== null) {
        const slotEl = container.children[targetSlot];
        if (slotEl) {
          slotEl.classList.add('drag-over');
        }
      }
    });

    container.addEventListener('dragleave', (e) => {
      if (!container.contains(e.relatedTarget)) {
        container.querySelectorAll('.bookmark-slot.drag-over').forEach(el => el.classList.remove('drag-over'));
      }
    });

    container.addEventListener('drop', async (e) => {
      e.preventDefault();
      container.querySelectorAll('.bookmark-slot.drag-over').forEach(el => el.classList.remove('drag-over'));

      if (dragSourceIndex === null) return;

      const targetSlot = this._getSlotFromCoordinates(container, e.clientX, e.clientY);
      if (targetSlot === null || targetSlot === dragSourceIndex) return;

      const dragged = this._displayedBookmarks[dragSourceIndex];
      const target = this._displayedBookmarks[targetSlot];

      this._displayedBookmarks[dragSourceIndex] = target || null;
      this._displayedBookmarks[targetSlot] = dragged || null;

      await this.saveDisplayedBookmarks(this._displayedBookmarks);
      dragSourceIndex = null;
      this.renderBookmarks(container, this._displayedBookmarks);
    });
  },

  _getSlotFromCoordinates(container, x, y) {
    const children = Array.from(container.children);
    if (children.length === 0) return 0;
    
    let closestSlot = null;
    let minDistance = Infinity;
    
    for (let i = 0; i < children.length; i++) {
      const rect = children[i].getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
      
      if (distance < minDistance) {
        minDistance = distance;
        closestSlot = parseInt(children[i].dataset.slotIndex);
      }
    }
    
    return closestSlot;
  },


  async render() {
    const container = document.getElementById('bookmarks-container');
    if (!container) return;

    await this.loadDisplayedBookmarks();

    const settings = await Storage.get('settings') || Storage.getDefaultSettings();
    const visibleIds = settings.visibleBookmarks || [];

    // Создаём карту позиций для пользовательских закладок
    const bookmarksToRender = [];
    for (let i = 0; i < BOOKMARK_SLOTS; i++) {
      bookmarksToRender[i] = this._displayedBookmarks[i] || null;
    }

    // Заполняем пустые слоты Chrome-закладками
    if (visibleIds.length > 0 && typeof chrome !== 'undefined' && chrome.bookmarks) {
      const folders = await this.getAllChromeBookmarks();
      const allBookmarks = this.flattenBookmarks(folders);
      const visibleBookmarks = allBookmarks.filter(bm => visibleIds.includes(bm.id));

      let vi = 0;
      for (let i = 0; i < BOOKMARK_SLOTS; i++) {
        if (bookmarksToRender[i] === null && vi < visibleBookmarks.length) {
          bookmarksToRender[i] = visibleBookmarks[vi++];
        }
      }
    }

    // Передаём полный массив с null-слотами
    this.renderBookmarks(container, bookmarksToRender);
  }
};

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    BookmarksManager.hideContextMenu();
  }
});
