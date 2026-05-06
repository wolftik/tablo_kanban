'use strict';

const KanbanBoard = (() => {
  let _settings = null;
  let _editingCard = null;
  let _editingColumnId = null;

  let _dom = {};
  let _boundDocKeydown = null;
  let _boundDocClickFilter = null;
  let _boundDocClickTags = null;
  let _driveSyncing = false;

  let _saveTimer = null;
  let _pendingSave = null;

  let _initialized = false;
  let _loading = false;

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
      tagsDropdownClear: document.getElementById('tags-dropdown-clear')
    };
  }

  async function _tryLoadFromDrive(saved) {
    if (_driveSyncing) return;
    try {
      const signedIn = await SyncProvider.isSignedIn();
      if (!signedIn) return;

      const driveModified = await SyncProvider.getLastModified();
      if (driveModified === 0) return;
      const localModified = saved._modified || 0;
      if (driveModified <= localModified) return;

      _driveSyncing = true;
      const driveData = await SyncProvider.download();
      if (driveData && driveData.columns) {
        saved.columns = driveData.columns;
        saved.tags = driveData.tags;
        saved.performers = driveData.performers;
        saved.authors = driveData.authors;
        saved.kanbanFilter = driveData.kanbanFilter;
        saved._modified = driveModified;
        await StorageLocal.set(KanbanConstants.STORAGE_KEY, saved);
      }
    } catch (e) {
      console.warn('[KanbanBoard] Drive sync load failed:', e, e?.message || JSON.stringify(e));
    } finally {
      _driveSyncing = false;
    }
  }

  async function init() {
    if (_loading) return;
    _loading = true;
    try {
      _settings = await StorageSync.get('settings') || getDefaultSettings();
      const saved = await StorageLocal.get(KanbanConstants.STORAGE_KEY) || {};

      await _tryLoadFromDrive(saved);
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
    } finally {
      _loading = false;
    }
  }

  async function _migrateFromSync(saved) {
    if (saved.columns) return;
    if (!_settings.columns) return;
    saved.columns = saved.columns || _settings.columns || [];
    saved._modified = Date.now();
    await StorageLocal.set(KanbanConstants.STORAGE_KEY, saved);
  }

  async function _flushSave() {
    const data = _pendingSave;
    _pendingSave = null;
    if (!data) return;
    await StorageLocal.set(KanbanConstants.STORAGE_KEY, data);

    if (_driveSyncing) {
      if (_pendingSave) {
        _saveTimer = setTimeout(_flushSave, 300);
      }
      return;
    }
    try {
      const signedIn = await SyncProvider.isSignedIn();
      if (!signedIn) return;

      _driveSyncing = true;
      await SyncProvider.upload(data);
    } catch (e) {
      console.warn('[KanbanBoard] Sync save failed:', e);
    } finally {
      _driveSyncing = false;
      if (_pendingSave) {
        _saveTimer = setTimeout(_flushSave, 300);
      }
    }
  }

  function save() {
    _pendingSave = KanbanStore.toSaveData();
    if (_saveTimer) clearTimeout(_saveTimer);
    _saveTimer = setTimeout(_flushSave, 300);
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
    if (!confirm(I18n.t('column.delete.card.confirm', { title: escapeHtml(_editingCard.title) }))) return;

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

    const lang = I18n.getLang();
    const phraseMap = { en: 'clear', es: 'vaciar', de: 'leeren', fr: 'vider', pt: 'limpar', nl: 'leegmaken', zh: '清空', ru: 'очистить', it: 'svuota', hi: 'साफ़ करें' };
    const phrase = phraseMap[lang] || 'clear';

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

    if (!confirm(I18n.t('column.delete.confirm', { title: escapeHtml(col.title) }))) return;

    KanbanStore.deleteColumn(columnId);
    KanbanRenderer.renderBoard(KanbanStore.getColumns());
    save();
  }

  function _bindEvents() {
    KanbanDnD.bindColumnReorder(_dom.board);
    KanbanDnD.bindColumnHeaderDrag(_dom.board);

    document.getElementById('card-save').addEventListener('click', () => _saveCard());
    document.getElementById('card-cancel').addEventListener('click', () => _closeModal());
    _dom.cardDeleteBtn.addEventListener('click', () => _deleteCard());

    _dom.cardTitle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') _saveCard();
      if (e.key === 'Escape') _closeModal();
    });

    _dom.modal.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('modal-overlay')) _closeModal();
    });

    if (_boundDocKeydown) document.removeEventListener('keydown', _boundDocKeydown);
    _boundDocKeydown = (e) => {
      if (e.key === 'Escape') _closeModal();
    };
    document.addEventListener('keydown', _boundDocKeydown);

    const filterSearch = _dom.filterSearch;
    const filterPriority = _dom.filterPriority;
    const filterAssignee = _dom.filterAssignee;
    const filterAuthor = _dom.filterAuthor;
    const filterClear = _dom.filterClear;
    let _filterChangeTimer = null;

    if (filterSearch) {
      let _searchTimer = null;
      filterSearch.addEventListener('input', () => {
        if (_searchTimer) clearTimeout(_searchTimer);
        _searchTimer = setTimeout(() => {
          _searchTimer = null;
          KanbanFilter.applyFilters(filterSearch.value, filterPriority?.value || '', filterAssignee?.value || '', filterAuthor?.value || '');
          KanbanRenderer.renderBoard(KanbanStore.getColumns());
          KanbanRenderer.updateClearButton();
        }, 150);
      });
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
      filterPriority.addEventListener('change', () => {
        KanbanFilter.applyFilters(filterSearch?.value || '', filterPriority.value, filterAssignee?.value || '', filterAuthor?.value || '');
        _debouncedFilterRender();
      });
    }
    if (filterAssignee) {
      filterAssignee.addEventListener('change', () => {
        KanbanFilter.applyFilters(filterSearch?.value || '', filterPriority?.value || '', filterAssignee.value, filterAuthor?.value || '');
        _debouncedFilterRender();
      });
    }
    if (filterAuthor) {
      filterAuthor.addEventListener('change', () => {
        KanbanFilter.applyFilters(filterSearch?.value || '', filterPriority?.value || '', filterAssignee?.value || '', filterAuthor.value);
        _debouncedFilterRender();
      });
    }
    if (filterClear) {
      filterClear.addEventListener('click', () => {
        KanbanFilter.clear();
        if (filterSearch) filterSearch.value = '';
        if (filterPriority) filterPriority.value = '';
        if (filterAssignee) filterAssignee.value = '';
        if (filterAuthor) filterAuthor.value = '';
        KanbanRenderer.renderBoard(KanbanStore.getColumns());
        KanbanRenderer.renderFilterUI();
        KanbanRenderer.updateClearButton();
      });
    }

    const tagsLabel = _dom.filterTagsLabel;
    if (tagsLabel) {
      tagsLabel.addEventListener('click', () => {
        const dropdown = _dom.filterTagsDropdown;
        if (!dropdown) return;
        const isVisible = dropdown.style.display === 'block';
        dropdown.style.display = isVisible ? 'none' : 'block';
        tagsLabel.classList.toggle('active', !isVisible);
        if (!isVisible) KanbanRenderer.renderTagsDropdown();
      });
    }

    if (_boundDocClickFilter) document.removeEventListener('click', _boundDocClickFilter);
    _boundDocClickFilter = (e) => {
      const dropdown = _dom.filterTagsDropdown;
      const label = _dom.filterTagsLabel;
      if (dropdown && label && !dropdown.contains(e.target) && !label.contains(e.target)) {
        dropdown.style.display = 'none';
        label.classList.remove('active');
      }
    };
    document.addEventListener('click', _boundDocClickFilter);

    const tagsDisplay = _dom.tagsDisplay;
    if (tagsDisplay) {
      tagsDisplay.addEventListener('click', (e) => {
        e.stopPropagation();
        _toggleTagsDropdown();
      });
    }

    const tagsClearBtn = _dom.tagsDropdownClear;
    if (tagsClearBtn) {
      tagsClearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.card-tag-option input[type="checkbox"]').forEach(cb => cb.checked = false);
        _updateTagsDisplay();
      });
    }

    if (_boundDocClickTags) document.removeEventListener('click', _boundDocClickTags);
    _boundDocClickTags = (e) => {
      const wrapper = _dom.tagsDropdownWrapper;
      if (wrapper && wrapper.classList.contains('active') && !wrapper.contains(e.target)) {
        _closeTagsDropdown();
      }
    };
    document.addEventListener('click', _boundDocClickTags);
  }

  return { init, save, getColumns };
})();
