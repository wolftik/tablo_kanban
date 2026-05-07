'use strict';

const KanbanBoard = (() => {
  let _settings = null;
  let _editingCard = null;
  let _editingColumnId = null;

  let _dom = {};
  let _boundEvents = [];
  let _cleanupFns = [];

  let _saveTimer = null;
  let _pendingSave = null;

  let _initialized = false;
  let _loading = false;

  function _clearEvents() {
    _boundEvents.forEach(({ el, type, handler, options }) => {
      try { el.removeEventListener(type, handler, options); } catch {}
    });
    _boundEvents = [];
    _cleanupFns.forEach(fn => { try { fn(); } catch {} });
    _cleanupFns = [];
  }

  function _addEvent(el, type, handler, options) {
    if (!el) return;
    el.addEventListener(type, handler, options);
    _boundEvents.push({ el, type, handler, options });
  }

  function _addCleanup(fn) {
    _cleanupFns.push(fn);
  }

  function _cacheDoms() {
    _dom = {
      board: document.getElementById('kanban-board'),
      modal: document.getElementById('edit-card-modal'),
      modalTitle: document.getElementById('modal-title'),
      cardTitle: document.getElementById('card-title-input'),
      cardDesc: document.getElementById('card-desc-input'),
      cardPriority: document.getElementById('card-priority-select'),
      cardAssignee: document.getElementById('card-assignee-select'),
      cardAuthor: document.getElementById('card-author-select'),
      cardDeleteBtn: document.getElementById('card-delete-btn'),
      cardTagsSelector: document.getElementById('card-tags-selector'),
      tagsDisplay: document.getElementById('card-tags-display'),
      tagsSelected: document.getElementById('card-tags-selected'),
      tagsDropdownWrapper: document.getElementById('card-tags-dropdown-wrapper'),
      tagsDropdown: document.getElementById('card-tags-dropdown'),
      filterSearch: document.getElementById('filter-search'),
      filterPriority: document.getElementById('filter-priority'),
      filterAssignee: document.getElementById('filter-assignee'),
      filterAuthor: document.getElementById('filter-author'),
      filterClear: document.getElementById('filter-clear'),
      filterTagsLabel: document.getElementById('filter-tags-label'),
      filterTagsDropdown: document.getElementById('filter-tags-dropdown'),
      filterTagsList: document.getElementById('filter-tags-list'),
      filterTagsChips: document.getElementById('filter-tags-chips'),
      tagsDropdownClear: document.getElementById('tags-dropdown-clear'),
      filterDateFrom: document.getElementById('filter-date-from'),
      filterDateTo: document.getElementById('filter-date-to'),
      archiveBtn: document.getElementById('archive-btn'),
      archiveModal: document.getElementById('archive-modal'),
      archiveList: document.getElementById('archive-list'),
      archiveCount: document.getElementById('archive-count')
    };
  }

  async function _migrateFromChromeStorage() {
    try {
      const chromeStorageAvailable = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
      if (!chromeStorageAvailable) return;

      const existingLocal = await StorageLocal.get(KanbanConstants.STORAGE_KEY);
      if (existingLocal && existingLocal.columns) return;

      const result = await chrome.storage.local.get(KanbanConstants.STORAGE_KEY);
      const chromeData = result[KanbanConstants.STORAGE_KEY];
      if (!chromeData || !chromeData.columns) return;

      await StorageLocal.set(KanbanConstants.STORAGE_KEY, chromeData);
      await chrome.storage.local.remove(KanbanConstants.STORAGE_KEY);
      console.log('[KanbanBoard] Migrated data from chrome.storage.local to localStorage');
    } catch (e) {
      console.warn('[KanbanBoard] Migration from chrome.storage.local failed:', e);
    }
  }

  async function init() {
    if (_loading) return;
    _loading = true;
    try {
      _settings = await StorageSync.get('settings') || getDefaultSettings();

      await _migrateFromChromeStorage();

      const saved = await StorageManager.get(KanbanConstants.STORAGE_KEY) || {};

      _migrateFromSync(saved);
      KanbanStore.loadData(saved);

      const filter = KanbanStore.getFilter();
      KanbanFilter.init(filter, _onFilterChange);

      if (!_initialized) {
        _cacheDoms();
        if (_dom.board) {
          _dom.board.innerHTML = '';
          _dom.board.classList.remove('kanban-initialized');
        }
        KanbanRenderer.init(_dom, {
          onEditCard: _openEditCardModal,
          onAddCard: _openNewCardModal,
          onAddColumn: _addColumn,
          onClearColumn: _clearColumnCards,
          onDeleteColumn: _deleteColumn,
          onFilterTagToggle: (tagId) => {
            KanbanFilter.toggleTag(tagId);
            _onFilterChange();
          },
          onFilterTagRemove: (tagId) => {
            KanbanFilter.removeTag(tagId);
            _onFilterChange();
          },
          onCardDragStart: (cardId, columnId) => {
            KanbanDnD.setDraggedCard(cardId, columnId);
          },
          onCardDragEnd: () => {
            KanbanDnD.clearDraggedCard();
          }
        });
        KanbanDnD.init(() => save());
        _bindEvents();
        _initialized = true;
      }

      KanbanRenderer.renderBoard(KanbanStore.getColumns());
      KanbanRenderer.renderFilterUI();
      KanbanRenderer.updateClearButton();

      await _autoArchive();
    } finally {
      _loading = false;
    }
  }

  async function _migrateFromSync(saved) {
    if (saved.columns) return;
    if (!_settings.columns) return;
    saved.columns = saved.columns || _settings.columns || [];
    saved._modified = Date.now();
    await StorageManager.set(KanbanConstants.STORAGE_KEY, saved);
  }

  let _lastSaveTime = 0;
  const _SAVE_THROTTLE_MS = 1000;
  let _saveInFlight = false;

  async function _flushSave() {
    _saveTimer = null;
    const data = _pendingSave;
    if (!data) return;

    const now = Date.now();
    if (now - _lastSaveTime < _SAVE_THROTTLE_MS) {
      _scheduleFlush();
      return;
    }

    _pendingSave = null;
    _saveInFlight = true;
    try {
      await StorageManager.set(KanbanConstants.STORAGE_KEY, data, (e) => console.error('Storage save error:', e));
      _lastSaveTime = now;
    } finally {
      _saveInFlight = false;
    }

    if (_pendingSave) {
      _scheduleFlush();
    }
  }

  function _scheduleFlush() {
    if (_saveTimer) clearTimeout(_saveTimer);
    if (_saveInFlight) return;
    _saveTimer = setTimeout(_flushSave, 300);
  }

  function save() {
    _pendingSave = KanbanStore.toSaveData();
    _scheduleFlush();
  }

  async function saveAndArchive() {
    save();
    await _autoArchive();
  }

  function getColumns() {
    return KanbanStore.getColumns();
  }

  function _onFilterChange() {
    KanbanStore.setFilter(KanbanFilter.toJSON());
    KanbanRenderer.renderBoard(KanbanStore.getColumns());
    KanbanRenderer.renderFilterUI();
    KanbanRenderer.updateClearButton();
  }

  function _openNewCardModal(columnId) {
    _editingCard = { title: '', description: '', priority: '', columnId, assignee: '', author: '', tags: [] };
    _editingColumnId = columnId;
    _populateModal(I18n.t('modal.new.task'), columnId, null);
  }

  function _openEditCardModal(card, columnId) {
    if (card._isTemporary) return;
    _editingCard = { ...card, tags: card.tags ? [...card.tags] : [] };
    _editingColumnId = columnId;
    _populateModal(I18n.t('modal.edit.task'), columnId, card);
  }

  function _populateModal(titleText, columnId, card) {
    _dom.modalTitle.textContent = titleText;
    _dom.cardTitle.value = card ? (card.title || '') : '';
    _dom.cardDesc.value = card ? (card.description || '') : '';
    _populateAssigneeSelect(card ? (card.assignee || '') : '');
    _populateAuthorSelect(card ? (card.author || '') : '');
    _dom.cardPriority.value = card ? (card.priority || '') : '';
    _dom.cardDeleteBtn.style.display = card ? 'inline-block' : 'none';
    _closeTagsDropdown();
    _populateTagSelector(card ? (card.tags || []) : []);
    _dom.modal.style.display = 'flex';
    setTimeout(() => _dom.cardTitle.focus(), 50);
  }

  function _closeModal() {
    _closeTagsDropdown();
    _dom.modal.style.display = 'none';
    _editingCard = null;
    _editingColumnId = null;
  }

  function _populateTagSelector(selectedTagIds) {
    const container = _dom.cardTagsSelector;
    if (!container) return;
    container.innerHTML = '';
    const tags = KanbanStore.getTags();
    if (tags.length === 0) {
      container.innerHTML = '<div class="card-tags-empty">' + I18n.t('column.no.tags') + '</div>';
      _updateTagsDisplay();
      return;
    }
    const fragment = document.createDocumentFragment();
    for (const tag of tags) {
      const label = document.createElement('label');
      label.className = 'card-tag-option';
      label.dataset.tagId = tag.id;
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = tag.id;
      cb.checked = selectedTagIds.includes(tag.id);
      const dot = document.createElement('span');
      dot.className = 'card-tag-dot';
      dot.style.background = tag.color;
      const span = document.createElement('span');
      span.className = 'card-tag-name';
      span.textContent = tag.name;
      label.appendChild(cb);
      label.appendChild(dot);
      label.appendChild(span);
      cb.addEventListener('change', () => _updateTagsDisplay());
      fragment.appendChild(label);
    }
    container.appendChild(fragment);
    _updateTagsDisplay();
  }

  function _updateTagsDisplay() {
    const display = _dom.tagsDisplay;
    const selectedContainer = _dom.tagsSelected;
    if (!display) return;
    display.innerHTML = '';
    selectedContainer.innerHTML = '';
    const checkboxes = document.querySelectorAll('#card-tags-selector input[type="checkbox"]');
    const checkedBoxes = Array.from(checkboxes).filter(cb => cb.checked);
    if (checkedBoxes.length === 0) {
      const placeholder = document.createElement('span');
      placeholder.className = 'tags-placeholder';
      placeholder.textContent = I18n.t('card.tags.placeholder');
      display.appendChild(placeholder);
      return;
    }
    const displayFragment = document.createDocumentFragment();
    const selectedFragment = document.createDocumentFragment();
    const tags = KanbanStore.getTags();
    for (const cb of checkedBoxes) {
      const tag = tags.find(t => t.id === cb.value);
      if (!tag) continue;
      const badge = document.createElement('span');
      badge.className = 'card-selected-tag';
      badge.style.background = tag.color;
      badge.innerHTML = `<span class="card-selected-tag-name">${escapeHtml(tag.name)}</span><span class="card-remove-tag" data-tag-id="${tag.id}" title="${I18n.t('card.tags.remove.title')}">&times;</span>`;
      const removeBtn = badge.querySelector('.card-remove-tag');
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        cb.checked = false;
        _updateTagsDisplay();
      });
      displayFragment.appendChild(badge);
      const dropdownBadge = badge.cloneNode(true);
      dropdownBadge.querySelector('.card-remove-tag').addEventListener('click', (e) => {
        e.stopPropagation();
        cb.checked = false;
        _updateTagsDisplay();
      });
      selectedFragment.appendChild(dropdownBadge);
    }
    display.appendChild(displayFragment);
    selectedContainer.appendChild(selectedFragment);
  }

  function _toggleTagsDropdown() {
    const wrapper = _dom.tagsDropdownWrapper;
    const dropdown = _dom.tagsDropdown;
    if (!wrapper || !dropdown) return;
    const isActive = wrapper.classList.contains('active');
    wrapper.classList.toggle('active', !isActive);
    dropdown.classList.toggle('active', !isActive);
  }

  function _closeTagsDropdown() {
    const wrapper = _dom.tagsDropdownWrapper;
    const dropdown = _dom.tagsDropdown;
    if (wrapper) wrapper.classList.remove('active');
    if (dropdown) dropdown.classList.remove('active');
    const selected = _dom.tagsSelected;
    if (selected) selected.innerHTML = '';
  }

  function _populateAssigneeSelect(selectedValue) {
    const select = _dom.cardAssignee;
    if (!select) return;
    select.innerHTML = '<option value="">' + I18n.t('modal.not.assigned') + '</option>';
    const fragment = document.createDocumentFragment();
    for (const performer of KanbanStore.getPerformers()) {
      const opt = document.createElement('option');
      opt.value = performer.name;
      opt.textContent = performer.name;
      if (performer.name === selectedValue) opt.selected = true;
      fragment.appendChild(opt);
    }
    select.appendChild(fragment);
  }

  function _populateAuthorSelect(selectedValue) {
    const select = _dom.cardAuthor;
    if (!select) return;
    select.innerHTML = '<option value="">' + I18n.t('modal.not.specified') + '</option>';
    const fragment = document.createDocumentFragment();
    for (const author of KanbanStore.getAuthors()) {
      const opt = document.createElement('option');
      opt.value = author.name;
      opt.textContent = author.name;
      if (author.name === selectedValue) opt.selected = true;
      fragment.appendChild(opt);
    }
    select.appendChild(fragment);
  }

  function _saveCard() {
    const title = _dom.cardTitle.value.trim();
    if (!title) return;

    const description = _dom.cardDesc.value.trim();
    const priority = _dom.cardPriority.value;
    const assignee = _dom.cardAssignee.value;
    const author = _dom.cardAuthor.value;

    const selectedTags = Array.from(document.querySelectorAll('.card-tag-option input[type="checkbox"]:checked')).map(cb => cb.value);

    if (_editingCard && _editingCard.id) {
      KanbanStore.updateCard(_editingColumnId, _editingCard.id, { title, description, priority, assignee, author, tags: selectedTags });
    } else {
      KanbanStore.addCard(_editingColumnId, { title, description, priority, assignee, author, tags: selectedTags });
    }

    _closeModal();
    KanbanRenderer.renderBoard(KanbanStore.getColumns());
    KanbanRenderer.renderFilterUI();
    save();
  }

  function _deleteCard() {
    if (!_editingCard || _editingCard._isTemporary) return;
    if (!confirm(I18n.t('column.delete.card.confirm', { title: _editingCard.title }))) return;

    KanbanStore.deleteCard(_editingColumnId, _editingCard.id);

    _closeModal();
    KanbanRenderer.renderBoard(KanbanStore.getColumns());
    save();
  }

  function _addColumn() {
    const modal = document.getElementById('add-column-modal');
    const titleInput = document.getElementById('new-column-title');
    const colorInput = document.getElementById('new-column-color');
    const saveBtn = document.getElementById('new-column-save');
    const cancelBtn = document.getElementById('new-column-cancel');

    titleInput.value = '';
    colorInput.value = '#6366f1';
    modal.style.display = 'flex';
    titleInput.focus();

    function cleanup() {
      modal.style.display = 'none';
      saveBtn.removeEventListener('click', onSave);
      cancelBtn.removeEventListener('click', onCancel);
      document.removeEventListener('keydown', onKeydown);
    }

    function onSave() {
      const title = titleInput.value.trim() || I18n.t('column.new.column');
      const color = colorInput.value;

      KanbanStore.addColumn(title, color);

      KanbanRenderer.renderBoard(KanbanStore.getColumns());
      save();
      cleanup();
    }

    function onCancel() {
      cleanup();
    }

    function onKeydown(e) {
      if (e.key === 'Enter') onSave();
      if (e.key === 'Escape') onCancel();
    }

    saveBtn.addEventListener('click', onSave);
    cancelBtn.addEventListener('click', onCancel);
    document.addEventListener('keydown', onKeydown);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) onCancel();
    });
  }

  function _clearColumnCards(columnId) {
    const col = KanbanStore.getColumns().find(c => c.id === columnId);
    if (!col) return;
    if (!col.cards || col.cards.length === 0) return;

    const phrase = I18n.t('column.clear.cards.phrase');

    const input = prompt(I18n.t('column.clear.cards.confirm', { phrase }), '');
    if (input === null) return;

    if (input.trim().toLowerCase() !== phrase.toLowerCase()) {
      alert(I18n.t('column.clear.cards.wrong'));
      return;
    }

    KanbanStore.clearColumnCards(columnId);
    KanbanRenderer.renderBoard(KanbanStore.getColumns());
    save();
  }

  function _deleteColumn(columnId) {
    if (KanbanStore.isFirstColumn(columnId)) return;
    const col = KanbanStore.getColumns().find(c => c.id === columnId);
    if (!col) return;
    if (KanbanStore.getColumns().length <= 1) return;

    if (!confirm(I18n.t('column.delete.confirm', { title: col.title }))) return;

    KanbanStore.deleteColumn(columnId);
    KanbanRenderer.renderBoard(KanbanStore.getColumns());
    save();
  }

  function _bindEvents() {
    _clearEvents();

    _addCleanup(KanbanDnD.bindColumnReorder(_dom.board));
    _addCleanup(KanbanDnD.bindColumnHeaderDrag(_dom.board));

    _addEvent(document.getElementById('card-save'), 'click', () => _saveCard());
    _addEvent(document.getElementById('card-cancel'), 'click', () => _closeModal());
    _addEvent(_dom.cardDeleteBtn, 'click', () => _deleteCard());

    _addEvent(_dom.cardTitle, 'keydown', (e) => {
      if (e.key === 'Enter') _saveCard();
      if (e.key === 'Escape') _closeModal();
    });

    _addEvent(_dom.modal, 'mousedown', (e) => {
      if (e.target.classList.contains('modal-overlay')) _closeModal();
    });

    _addEvent(document, 'keydown', (e) => {
      if (e.key === 'Escape') _closeModal();
    });

    const filterSearch = _dom.filterSearch;
    const filterPriority = _dom.filterPriority;
    const filterAssignee = _dom.filterAssignee;
    const filterAuthor = _dom.filterAuthor;
    const filterClear = _dom.filterClear;
    let _filterChangeTimer = null;

    if (filterSearch) {
      let _searchTimer = null;
      _addEvent(filterSearch, 'input', () => {
        if (_searchTimer) clearTimeout(_searchTimer);
        _searchTimer = setTimeout(() => {
          _searchTimer = null;
          _applyFilterFromDOM();
          KanbanRenderer.renderBoard(KanbanStore.getColumns());
          KanbanRenderer.updateClearButton();
        }, 150);
      });
    }

    function _applyFilterFromDOM() {
      KanbanFilter.applyFilters(
        filterSearch?.value || '',
        filterPriority?.value || '',
        filterAssignee?.value || '',
        filterAuthor?.value || ''
      );
    }

    function _debouncedFilterRender() {
      if (_filterChangeTimer) clearTimeout(_filterChangeTimer);
      _filterChangeTimer = setTimeout(() => {
        _filterChangeTimer = null;
        KanbanRenderer.renderBoard(KanbanStore.getColumns());
        KanbanRenderer.updateClearButton();
      }, 100);
    }

    if (filterPriority) {
      _addEvent(filterPriority, 'change', () => {
        _applyFilterFromDOM();
        _debouncedFilterRender();
      });
    }
    if (filterAssignee) {
      _addEvent(filterAssignee, 'change', () => {
        _applyFilterFromDOM();
        _debouncedFilterRender();
      });
    }
    if (filterAuthor) {
      _addEvent(filterAuthor, 'change', () => {
        _applyFilterFromDOM();
        _debouncedFilterRender();
      });
    }
    if (filterClear) {
      _addEvent(filterClear, 'click', () => {
        KanbanFilter.clear();
        if (filterSearch) filterSearch.value = '';
        if (filterPriority) filterPriority.value = '';
        if (filterAssignee) filterAssignee.value = '';
        if (filterAuthor) filterAuthor.value = '';
        if (_dom.filterDateFrom) _dom.filterDateFrom.value = '';
        if (_dom.filterDateTo) _dom.filterDateTo.value = '';
        KanbanRenderer.renderBoard(KanbanStore.getColumns());
        KanbanRenderer.renderFilterUI();
        KanbanRenderer.updateClearButton();
      });
    }

    const tagsLabel = _dom.filterTagsLabel;
    if (tagsLabel) {
      _addEvent(tagsLabel, 'click', () => {
        const dropdown = _dom.filterTagsDropdown;
        if (!dropdown) return;
        const isVisible = dropdown.style.display === 'block';
        dropdown.style.display = isVisible ? 'none' : 'block';
        tagsLabel.classList.toggle('active', !isVisible);
        if (!isVisible) KanbanRenderer.renderTagsDropdown();
      });
    }

    _addEvent(document, 'click', (e) => {
      const dropdown = _dom.filterTagsDropdown;
      const label = _dom.filterTagsLabel;
      if (dropdown && label && !dropdown.contains(e.target) && !label.contains(e.target)) {
        dropdown.style.display = 'none';
        label.classList.remove('active');
      }
    });

    const tagsDisplay = _dom.tagsDisplay;
    if (tagsDisplay) {
      _addEvent(tagsDisplay, 'click', (e) => {
        e.stopPropagation();
        _toggleTagsDropdown();
      });
    }

    const tagsClearBtn = _dom.tagsDropdownClear;
    if (tagsClearBtn) {
      _addEvent(tagsClearBtn, 'click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.card-tag-option input[type="checkbox"]').forEach(cb => cb.checked = false);
        _updateTagsDisplay();
      });
    }

    _addEvent(document, 'click', (e) => {
      const wrapper = _dom.tagsDropdownWrapper;
      if (wrapper && wrapper.classList.contains('active') && !wrapper.contains(e.target)) {
        _closeTagsDropdown();
      }
    });

    // Date filter events
    const dateFrom = _dom.filterDateFrom;
    const dateTo = _dom.filterDateTo;
    if (dateFrom) {
      let _dateTimer = null;
      _addEvent(dateFrom, 'change', () => {
        if (_dateTimer) clearTimeout(_dateTimer);
        _dateTimer = setTimeout(() => {
          _dateTimer = null;
          KanbanFilter.setDateRange(dateFrom.value || null, dateTo?.value || null);
          _onFilterChange();
        }, 300);
      });
    }
    if (dateTo) {
      let _dateTimer2 = null;
      _addEvent(dateTo, 'change', () => {
        if (_dateTimer2) clearTimeout(_dateTimer2);
        _dateTimer2 = setTimeout(() => {
          _dateTimer2 = null;
          KanbanFilter.setDateRange(dateFrom?.value || null, dateTo.value || null);
          _onFilterChange();
        }, 300);
      });
    }

    // Archive events
    const archiveBtn = _dom.archiveBtn;
    if (archiveBtn) {
      _addEvent(archiveBtn, 'click', () => _openArchiveModal());
    }
  }

  // ===== Archive =====

  async function _autoArchive() {
    const mode = await StorageManager.getMode();
    if (mode !== 'local') return;

    const columns = KanbanStore.getColumns();
    const result = await ArchiveManager.archiveOldCards(columns);
    if (result.archivedCount > 0) {
      save();
      _showArchiveToast(result.archivedCount);
    }
  }

  function _showArchiveToast(count) {
    const toast = document.createElement('div');
    toast.className = 'archive-toast';
    toast.textContent = I18n.t('storage.archived', { count });
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  }

  async function _openArchiveModal() {
    const archiveInfo = await ArchiveManager.getArchiveInfo();
    const list = _dom.archiveList;
    const countEl = _dom.archiveCount;
    const modal = _dom.archiveModal;
    if (!list || !modal) return;

    if (countEl) countEl.textContent = String(archiveInfo.count);

    list.innerHTML = '';

    if (archiveInfo.count === 0) {
      list.innerHTML = '<div class="archive-empty">' + I18n.t('archive.empty') + '</div>';
    } else {
      const archive = await ArchiveManager.getArchive();
      for (const card of archive.cards) {
        const item = document.createElement('div');
        item.className = 'archive-item';

        const title = document.createElement('div');
        title.className = 'archive-item-title';
        title.textContent = card.title || I18n.t('modal.no.title');

        const meta = document.createElement('div');
        meta.className = 'archive-item-meta';
        const colTitle = card._originalColumnTitle || 'Unknown';
        const archivedDate = card._archivedAt ? new Date(card._archivedAt).toLocaleDateString() : '?';
        meta.textContent = colTitle + ' — ' + archivedDate;

        const actions = document.createElement('div');
        actions.className = 'archive-item-actions';

        const restoreBtn = document.createElement('button');
        restoreBtn.className = 'archive-restore-btn';
        restoreBtn.textContent = I18n.t('archive.restore');
        restoreBtn.addEventListener('click', async () => {
          const restored = await ArchiveManager.restoreCard(card.id);
          if (restored) {
            const colId = restored._originalColumnId;
            const cols = KanbanStore.getColumns();
            const targetCol = cols.find(c => c.id === colId) || cols[0];
            KanbanStore.addCard(targetCol.id, {
              title: restored.title,
              description: restored.description,
              priority: restored.priority,
              assignee: restored.assignee,
              author: restored.author,
              tags: restored.tags
            });
            KanbanRenderer.renderBoard(KanbanStore.getColumns());
            save();
            _openArchiveModal();
          }
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'archive-delete-btn';
        deleteBtn.textContent = I18n.t('archive.delete');
        deleteBtn.addEventListener('click', async () => {
          const archive = await ArchiveManager.getArchive();
          archive.cards = archive.cards.filter(c => c.id !== card.id);
          archive._modified = Date.now();
          await ArchiveManager.saveArchive(archive);
          _openArchiveModal();
        });

        actions.appendChild(restoreBtn);
        actions.appendChild(deleteBtn);

        item.appendChild(title);
        item.appendChild(meta);
        item.appendChild(actions);
        list.appendChild(item);
      }
    }

    modal.style.display = 'flex';
  }

  function _closeArchiveModal() {
    const modal = _dom.archiveModal;
    if (modal) modal.style.display = 'none';
  }

  return { init, save, getColumns };
})();
