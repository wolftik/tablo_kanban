'use strict';

let _bookmarkSlots = 22;
let _bookmarkGridColumns = 11; // updated in _loadSettings()

const BookmarksManager = (() => {
  let _displayedBookmarks = [];
  let _responsiveObserver = null;
  let _widgetsForcedHidden = false;
  let _quotesHidden = false;
  let _cachedZoneWidth = 0;
  let _cachedQuotesWidth = 0;
  let _editingBookmark = null;

  // Min container width to fit the bookmark grid without overflow
  function _minFitWidth(cols) {
    return cols * 60 + (cols - 1) * 8;
  }

  // Update compact/minimal display mode based on slot width
  function _updateCompactMode(container) {
    const firstSlot = container.querySelector('.bookmark-slot');
    if (!firstSlot) return;
    const slotWidth = firstSlot.offsetWidth;
    container.classList.remove('compact', 'minimal');
    if (slotWidth < 60) {
      container.classList.add('minimal');
    } else if (slotWidth < 80) {
      container.classList.add('compact');
    }
  }

  async function _loadSettings() {
    const settings = await StorageSync.get('settings') || getDefaultSettings();
    _bookmarkSlots = settings.bookmarkSlots != null ? settings.bookmarkSlots : 22;
    _bookmarkGridColumns = _bookmarkSlots < 12 ? _bookmarkSlots : Math.ceil(_bookmarkSlots / 2);
    return settings;
  }

  async function loadDisplayedBookmarks() {
    await _loadSettings();
    const raw = await StorageSync.get('bookmarks_display') || [];
    _displayedBookmarks = [];
    for (let i = 0; i < _bookmarkSlots; i++) {
      _displayedBookmarks[i] = raw[i] || null;
    }
    return _displayedBookmarks;
  }

  async function saveDisplayedBookmarks(bookmarks) {
    _displayedBookmarks = bookmarks;
    await StorageSync.set('bookmarks_display', bookmarks);
  }

  async function addDisplayedBookmark(url, title, position = null) {
    if (_displayedBookmarks.some(b => b && b.url === url)) return _displayedBookmarks;
    const newBookmark = { id: generateId(), url, title: title || url };
    if (position !== null && position >= 0 && position < _bookmarkSlots && !_displayedBookmarks[position]) {
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

  let _dragDropInitialized = false;
  let _responsiveInitialized = false;
  let _rafId = null;

  function _initResponsive(container) {
    if (_responsiveObserver) _responsiveObserver.disconnect();
    _responsiveObserver = new ResizeObserver(() => {
      if (_rafId) return;
      _rafId = requestAnimationFrame(() => {
        _rafId = null;
        _updateResponsiveLayout(container);
      });
    });
    _responsiveObserver.observe(container);
    _updateResponsiveLayout(container);
  }

  // Predictive check: would restoring a hidden widget cause overflow?
  // Returns true if the widget can be safely restored.
  function _canRestore(containerW, cachedWidth, cols, slotWidth) {
    if (slotWidth < 60) return false;
    const minFit = _minFitWidth(cols);
    const predictedW = containerW - (cachedWidth || 150); // fallback estimate
    return predictedW >= minFit;
  }

  function _updateResponsiveLayout(container) {
    if (!container || !container.isConnected) return;

    const headBar = document.getElementById('head-bar');
    const widgetsZone = document.getElementById('widgets-zone');
    const hasWidgets = widgetsZone && widgetsZone.dataset.enabled === 'true';

    if (!hasWidgets) {
      _widgetsForcedHidden = false;
      _quotesHidden = false;
      _cachedZoneWidth = 0;
      _cachedQuotesWidth = 0;
      _updateCompactMode(container);
      return;
    }

    const childCount = container.children.length;
    if (childCount === 0) {
      widgetsZone.classList.add('active');
      _widgetsForcedHidden = false;
      _cachedZoneWidth = 0;
      if (_quotesHidden) {
        const qe = document.getElementById('quotes-widget');
        if (qe) { qe.style.display = ''; _quotesHidden = false; _cachedQuotesWidth = 0; }
      }
      if (headBar && headBar.classList.contains('no-bookmarks')) {
        headBar.classList.remove('no-widgets');
      }
      _updateCompactMode(container);
      return;
    }

    const lastChild = container.children[childCount - 1];
    const lastRect = lastChild.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const overflowed = lastRect.left + lastRect.width > containerRect.right + 2;

    const cols = _bookmarkGridColumns;
    const firstSlot = container.querySelector('.bookmark-slot');
    const slotWidth = firstSlot ? firstSlot.offsetWidth : 0;
    const containerW = containerRect.width;

    const quotesEl = document.getElementById('quotes-widget');

    if (overflowed) {
      // Cascade hide: quotes → widgets-zone
      if (quotesEl && quotesEl.style.display !== 'none') {
        _cachedQuotesWidth = quotesEl.offsetWidth;
        quotesEl.style.display = 'none';
        _quotesHidden = true;
        return;
      }
      if (widgetsZone.classList.contains('active')) {
        _cachedZoneWidth = widgetsZone.offsetWidth;
        widgetsZone.classList.remove('active');
        _widgetsForcedHidden = true;
        if (headBar) headBar.classList.add('no-widgets');
        return;
      }
    }

    if (!overflowed) {
      // Restore: widgets-zone → quotes
      if (_widgetsForcedHidden) {
        if (_canRestore(containerW, _cachedZoneWidth, cols, slotWidth)) {
          widgetsZone.classList.add('active');
          _widgetsForcedHidden = false;
          _cachedZoneWidth = 0;
          if (headBar) headBar.classList.remove('no-widgets');
          return;
        }
      }
      if (!_widgetsForcedHidden && _quotesHidden && quotesEl) {
        if (_canRestore(containerW, _cachedQuotesWidth, cols, slotWidth)) {
          quotesEl.style.display = '';
          _quotesHidden = false;
          _cachedQuotesWidth = 0;
          return;
        }
      }
    }

    _updateCompactMode(container);
  }

  async function render() {
    const container = document.getElementById('bookmarks-container');
    if (!container) return;

    if (!_responsiveInitialized) {
      _initResponsive(container);
      _responsiveInitialized = true;
    }

    if (!_dragDropInitialized) {
      _initDragDrop(container);
      _dragDropInitialized = true;
    }

    await loadDisplayedBookmarks();

    const bookmarksToRender = [..._displayedBookmarks];

    _renderBookmarks(container, bookmarksToRender);
  }

  function _renderBookmarks(container, bookmarks) {
    const headBar = document.getElementById('head-bar');
    if (headBar) {
      headBar.classList.toggle('no-bookmarks', _bookmarkSlots === 0);
      if (_bookmarkSlots === 0) {
        const wz = document.getElementById('widgets-zone');
        headBar.classList.toggle('no-widgets', !(wz && wz.classList.contains('active')));
      } else {
        headBar.classList.remove('no-widgets');
      }
    }

    container.classList.add('centered');

    if (_bookmarkSlots === 0) {
      container.innerHTML = '';
      container.style.setProperty('--bookmark-grid-columns', '1');
      return;
    }
    container.innerHTML = '';
    container.style.setProperty('--bookmark-grid-columns', _bookmarkGridColumns);
    const isSingleRow = _bookmarkSlots < 12;
    container.style.gridTemplateRows = isSingleRow ? 'repeat(1, var(--bookmark-slot-height))' : 'repeat(2, var(--bookmark-slot-height))';
    container.classList.toggle('single-row', isSingleRow);
    if (headBar) headBar.classList.toggle('single-row', isSingleRow);

    for (let i = 0; i < _bookmarkSlots; i++) {
      const slot = document.createElement('div');
      slot.className = 'bookmark-slot';
      slot.draggable = true;
      slot.dataset.slotIndex = i;

      const bm = bookmarks[i];
      if (bm != null) {
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
        const _faviconSources = [
          `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`,
          `https://icons.duckduckgo.com/ip3/${hostname}.ico`,
        ];
        let _faviconIndex = 0;
        const FALLBACK_SVG = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="%2394a3b8"/></svg>';
        favicon.src = _faviconSources[0];
        favicon.onerror = () => {
          _faviconIndex++;
          if (_faviconIndex < _faviconSources.length) {
            favicon.src = _faviconSources[_faviconIndex];
          } else {
            favicon.src = FALLBACK_SVG;
          }
        };

        const titleEl = document.createElement('span');
        titleEl.className = 'bookmark-title';
        titleEl.textContent = bm.title;

        const menuBtn = document.createElement('button');
        menuBtn.className = 'bookmark-menu-btn';
        menuBtn.innerHTML = '&#8942;';

        slot.appendChild(favicon);
        slot.appendChild(titleEl);
        slot.appendChild(menuBtn);
      } else {
        slot.classList.add('empty');
        slot.innerHTML = `
          <span class="placeholder-icon">⁂</span>
          <span class="placeholder-text">${I18n.t('card.placeholder.add.site')}</span>
        `;
      }

      container.appendChild(slot);
    }

    // Delegated click handler (avoids memory leaks from per-slot listeners)
    container.onclick = (e) => {
      const menuBtn = e.target.closest('.bookmark-menu-btn');
      const slot = e.target.closest('.bookmark-slot');
      if (!slot) return;

      if (menuBtn) {
        e.preventDefault();
        e.stopPropagation();
        const bm = bookmarks[parseInt(slot.dataset.slotIndex)];
        if (bm) {
          BookmarksContextMenu.show(e.clientX, e.clientY, bm, container, {
            onEdit: _openEditModal,
            onDelete: async (bookmark) => {
              await removeDisplayedBookmark(bookmark.id);
              render();
            }
          });
        }
        return;
      }

      if (slot.classList.contains('filled')) {
        const bm = bookmarks[parseInt(slot.dataset.slotIndex)];
        if (bm) _openUrl(bm.url);
      } else if (slot.classList.contains('empty')) {
        const modal = document.getElementById('add-bookmark-modal');
        const urlInput = document.getElementById('bookmark-url');
        if (modal && urlInput) {
          container.querySelectorAll('.bookmark-slot.empty.active').forEach(p => p.classList.remove('active'));
          slot.classList.add('active');
          modal.dataset.targetIndex = slot.dataset.slotIndex;
          modal.style.display = 'flex';
          urlInput.focus();
        }
      }
    };
  }

  function _createRafBookmarkSlotFinder(container) {
    let _rafId = null;
    let _pendingX = 0;
    let _pendingY = 0;

    function _process() {
      _rafId = null;
      container.querySelectorAll('.bookmark-slot.drag-over').forEach(el => el.classList.remove('drag-over'));
      const targetSlot = _getSlotFromCoordinates(container, _pendingX, _pendingY);
      if (targetSlot !== null) {
        const slotEl = container.children[targetSlot];
        if (slotEl) slotEl.classList.add('drag-over');
      }
    }

    return function(x, y) {
      _pendingX = x;
      _pendingY = y;
      if (!_rafId) {
        _rafId = requestAnimationFrame(_process);
      }
    };
  }

  function _initDragDrop(container) {
    let sourceIndex = null;
    const _rafSlotFinder = _createRafBookmarkSlotFinder(container);

    container.addEventListener('dragstart', (e) => {
      const slot = e.target.closest('.bookmark-slot');
      if (!slot) return;
      sourceIndex = parseInt(slot.dataset.slotIndex);
      slot.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(sourceIndex));
    });

    container.addEventListener('dragend', () => {
      sourceIndex = null;
      container.querySelectorAll('.bookmark-slot.dragging').forEach(el => el.classList.remove('dragging'));
      container.querySelectorAll('.bookmark-slot.drag-over').forEach(el => el.classList.remove('drag-over'));
    });

    container.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      _rafSlotFinder(e.clientX, e.clientY);
    });

    container.addEventListener('dragleave', (e) => {
      if (!container.contains(e.relatedTarget)) {
        container.querySelectorAll('.bookmark-slot.drag-over').forEach(el => el.classList.remove('drag-over'));
      }
    });

    container.addEventListener('drop', async (e) => {
      e.preventDefault();
      container.querySelectorAll('.bookmark-slot.drag-over').forEach(el => el.classList.remove('drag-over'));

      if (sourceIndex === null) return;

      const targetSlot = _getSlotFromCoordinates(container, e.clientX, e.clientY);
      if (targetSlot === null || targetSlot === sourceIndex) return;

      const dragged = _displayedBookmarks[sourceIndex];
      const target = _displayedBookmarks[targetSlot];

      _displayedBookmarks[sourceIndex] = target || null;
      _displayedBookmarks[targetSlot] = dragged || null;

      await saveDisplayedBookmarks(_displayedBookmarks);
      sourceIndex = null;
      _renderBookmarks(container, _displayedBookmarks);
    });
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

  function _openEditModal(bookmark) {
    const modal = document.getElementById('bookmark-edit-modal');
    if (!modal) return;

    _editingBookmark = bookmark;
    // Keep DOM properties for backward compat with newtab.js edit handler
    modal._currentBookmark = bookmark;
    modal._displayedBookmarks = _displayedBookmarks;

    const urlInput = document.getElementById('bookmark-edit-url');
    const titleInput = document.getElementById('bookmark-edit-title');
    if (!urlInput || !titleInput) return;

    urlInput.value = bookmark.url;
    titleInput.value = bookmark.title;
    modal.style.display = 'flex';
  }

  function _getSlotFromCoordinates(container, x, y) {
    const children = Array.from(container.children);
    if (children.length === 0) return 0;

    const cols = _bookmarkGridColumns;

    let row = 0;
    let minRowDist = Infinity;
    for (let i = 0; i < children.length; i++) {
      const rect = children[i].getBoundingClientRect();
      const dist = Math.abs(y - (rect.top + rect.height / 2));
      if (dist < minRowDist) {
        minRowDist = dist;
        row = Math.floor(i / cols);
      }
    }

    const rowStart = row * cols;
    const rowEnd = Math.min(rowStart + cols, children.length);

    let col = 0;
    let minColDist = Infinity;
    for (let i = rowStart; i < rowEnd; i++) {
      const rect = children[i].getBoundingClientRect();
      const elementCenter = rect.left + rect.width / 2;
      const dist = Math.abs(x - elementCenter);
      if (dist < minColDist) {
        minColDist = dist;
        col = i - rowStart;
      }
    }

    const targetIndex = row * cols + col;
    return targetIndex < children.length ? parseInt(children[targetIndex].dataset.slotIndex) : null;
  }

  return {
    render,
    loadDisplayedBookmarks,
    saveDisplayedBookmarks,
    addDisplayedBookmark,
    removeDisplayedBookmark,
    destroy() {
      if (_responsiveObserver) {
        _responsiveObserver.disconnect();
        _responsiveObserver = null;
      }
      _responsiveInitialized = false;
      _dragDropInitialized = false;
      _widgetsForcedHidden = false;
      _quotesHidden = false;
      _cachedZoneWidth = 0;
      _cachedQuotesWidth = 0;
    }
  };
})();
