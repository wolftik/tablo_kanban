'use strict';

const BOOKMARK_SLOTS = 22;
const BOOKMARK_GRID_COLUMNS = 11;

const BookmarksManager = (() => {
  let _displayedBookmarks = [];

  async function loadDisplayedBookmarks() {
    _displayedBookmarks = await StorageSync.get('bookmarks_display') || [];
    return _displayedBookmarks;
  }

  async function saveDisplayedBookmarks(bookmarks) {
    _displayedBookmarks = bookmarks;
    await StorageSync.set('bookmarks_display', bookmarks);
  }

  async function addDisplayedBookmark(url, title, position = null) {
    if (_displayedBookmarks.some(b => b && b.url === url)) return _displayedBookmarks;
    const newBookmark = { id: generateId(), url, title: title || url };
    if (position !== null && position >= 0 && position < BOOKMARK_SLOTS && !_displayedBookmarks[position]) {
      _displayedBookmarks[position] = newBookmark;
    } else {
      let emptyIndex = _displayedBookmarks.indexOf(null);
      if (emptyIndex === -1) emptyIndex = _displayedBookmarks.length;
      _displayedBookmarks[emptyIndex] = newBookmark;
    }
    await saveDisplayedBookmarks(_displayedBookmarks);
    return _displayedBookmarks;
  }

  async function removeDisplayedBookmark(id) {
    const index = _displayedBookmarks.findIndex(b => b && b.id === id);
    if (index !== -1) {
      _displayedBookmarks[index] = null;
      await saveDisplayedBookmarks(_displayedBookmarks);
    }
    return _displayedBookmarks;
  }

  function generateId() {
    return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  function getDisplayedBookmarks() {
    return _displayedBookmarks;
  }

  function getGridColumns() {
    return BOOKMARK_GRID_COLUMNS;
  }

  async function render() {
    const container = document.getElementById('bookmarks-container');
    if (!container) return;

    await loadDisplayedBookmarks();

    const settings = await StorageSync.get('settings') || _getDefaultSettings();
    const visibleIds = settings.visibleBookmarks || [];

    const bookmarksToRender = [];
    for (let i = 0; i < BOOKMARK_SLOTS; i++) {
      bookmarksToRender[i] = _displayedBookmarks[i] || null;
    }

    if (visibleIds.length > 0 && typeof chrome !== 'undefined' && chrome.bookmarks) {
      const folders = await _getAllChromeBookmarks();
      const allBookmarks = _flattenBookmarks(folders);
      const visibleBookmarks = allBookmarks.filter(bm => visibleIds.includes(bm.id));

      let vi = 0;
      for (let i = 0; i < BOOKMARK_SLOTS; i++) {
        if (bookmarksToRender[i] === null && vi < visibleBookmarks.length) {
          bookmarksToRender[i] = visibleBookmarks[vi++];
        }
      }
    }

    _renderBookmarks(container, bookmarksToRender);
  }

  function _getDefaultSettings() {
    return {
      theme: 'system',
      cardSize: 'standard',
      showFavicon: true,
      visibleBookmarks: [],
      performers: [],
      tags: [],
      authors: [],
      kanbanFilter: {}
    };
  }

  function _getAllChromeBookmarks() {
    return new Promise((resolve) => {
      if (typeof chrome === 'undefined' || !chrome.bookmarks) {
        resolve([]);
        return;
      }
      chrome.bookmarks.getTree((result) => resolve(result));
    });
  }

  function _flattenBookmarks(nodes, result = []) {
    for (const node of nodes) {
      if (node.url) {
        result.push({ id: node.id, url: node.url, title: node.title || node.url, dateAdded: node.dateAdded });
      }
      if (node.children) _flattenBookmarks(node.children, result);
    }
    return result;
  }

  function _renderBookmarks(container, bookmarks) {
    container.innerHTML = '';

    const bookmarkMap = new Map();
    for (let i = 0; i < bookmarks.length; i++) {
      if (bookmarks[i] != null) bookmarkMap.set(i, bookmarks[i]);
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
          BookmarksContextMenu.show(e.clientX, e.clientY, bm, container, {
            onEdit: _openEditModal,
            onDelete: async (bookmark, ctx) => {
              await removeDisplayedBookmark(bookmark.id);
              render();
            }
          });
        });

        slot.addEventListener('click', (e) => {
          if (e.target.closest('.bookmark-menu-btn')) return;
          _openUrl(bm.url);
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

    _bindBookmarkDragDrop(container);
  }

  function _openUrl(url) {
    try {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {}
  }

  let _editModalCurrentBookmark = null;
  let _editModalCurrentContainer = null;

  function _openEditModal(bookmark) {
    _editModalCurrentBookmark = bookmark;
    _editModalCurrentContainer = document.getElementById('bookmarks-container');

    let modal = document.getElementById('bookmark-edit-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'bookmark-edit-modal';
      modal.className = 'modal-overlay';
      modal.style.display = 'none';
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

      modal.querySelector('#bookmark-edit-cancel').onclick = () => { modal.style.display = 'none'; };
      modal.querySelector('#bookmark-edit-save').onclick = () => {
        const newUrl = document.getElementById('bookmark-edit-url').value;
        const newTitle = document.getElementById('bookmark-edit-title').value;
        if (newUrl && _editModalCurrentBookmark) {
          const index = _displayedBookmarks.findIndex(b => b && b.id === _editModalCurrentBookmark.id);
          if (index !== -1) {
            _displayedBookmarks[index] = { ..._displayedBookmarks[index], url: newUrl, title: newTitle || newUrl };
            saveDisplayedBookmarks(_displayedBookmarks).then(() => {
              render();
              modal.style.display = 'none';
            });
          }
        }
      };

      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
      });
    }

    document.getElementById('bookmark-edit-url').value = bookmark.url;
    document.getElementById('bookmark-edit-title').value = bookmark.title;
    modal.style.display = 'flex';
  }

  function _bindBookmarkDragDrop(container) {
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

      const targetSlot = _getSlotFromCoordinates(container, e.clientX, e.clientY);
      container.querySelectorAll('.bookmark-slot.drag-over').forEach(el => el.classList.remove('drag-over'));
      if (targetSlot !== null) {
        const slotEl = container.children[targetSlot];
        if (slotEl) slotEl.classList.add('drag-over');
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

      const targetSlot = _getSlotFromCoordinates(container, e.clientX, e.clientY);
      if (targetSlot === null || targetSlot === dragSourceIndex) return;

      const dragged = _displayedBookmarks[dragSourceIndex];
      const target = _displayedBookmarks[targetSlot];

      _displayedBookmarks[dragSourceIndex] = target || null;
      _displayedBookmarks[targetSlot] = dragged || null;

      await saveDisplayedBookmarks(_displayedBookmarks);
      dragSourceIndex = null;
      _renderBookmarks(container, _displayedBookmarks);
    });
  }

  function _getSlotFromCoordinates(container, x, y) {
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
  }

  return {
    render,
    loadDisplayedBookmarks,
    saveDisplayedBookmarks,
    addDisplayedBookmark,
    removeDisplayedBookmark,
    getDisplayedBookmarks,
    getGridColumns
  };
})();

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    BookmarksContextMenu.hide();
  }
});
