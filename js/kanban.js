'use strict';

moduleGuard('I18n');
moduleGuard('StorageSync');
moduleGuard('StorageLocal');
moduleGuard('KanbanConstants');
moduleGuard('KanbanFilter');
moduleGuard('KanbanCard');
const KanbanBoard = (() => {
  let _columns = [];
  let _settings = null;
  let _editingCard = null;
  let _editingColumnId = null;
  let _draggedCard = null;
  let _draggedColumn = null;
  let _rafGetDragAfterElement = createRafDragAfterElement();
  let _tagsIndex = null;

  let _dom = {};
  let _boundDocKeydown = null;
  let _boundDocClickFilter = null;
  let _boundDocClickTags = null;

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
      filterClear: document.getElementById('filter-clear'),
      filterTagsLabel: document.getElementById('filter-tags-label'),
      filterTagsDropdown: document.getElementById('filter-tags-dropdown'),
      filterTagsList: document.getElementById('filter-tags-list'),
      filterTagsChips: document.getElementById('filter-tags-chips'),
      tagsDropdownClear: document.getElementById('tags-dropdown-clear')
    };
  }

  function _updateTagsIndex() {
    if (!_settings || !_settings.tags) {
      _tagsIndex = new Map();
      return;
    }
    _tagsIndex = new Map(_settings.tags.map(t => [t.id, t]));
  }

  function _tagById(id) {
    return _tagsIndex ? _tagsIndex.get(id) : null;
  }

  async function init() {
    _settings = await StorageSync.get('settings') || getDefaultSettings();
    const saved = await StorageLocal.get(KanbanConstants.STORAGE_KEY);
    _columns = saved && saved.columns ? saved.columns : _createDefaultColumns();
    _columns.forEach(col => col.cards = col.cards || []);

    _updateTagsIndex();

    KanbanFilter.init(
      _settings.kanbanFilter || { search: '', priority: '', assignee: '', tags: [] },
      _onFilterChange
    );

    _cacheDoms();
    _renderBoard();
    _bindEvents();
    _renderFilterUI();
    _updateClearButton();
  }

  async function save() {
    _columns.forEach((col, i) => { col.order = i; });
    await StorageLocal.set(KanbanConstants.STORAGE_KEY, { columns: _columns });

    const settings = await StorageSync.get('settings') || getDefaultSettings();
    settings.kanbanFilter = KanbanFilter.toJSON();
    settings.theme = _settings?.theme || settings.theme;
    settings.tags = _settings?.tags || settings.tags;
    settings.performers = _settings?.performers || settings.performers;
    settings.authors = _settings?.authors || settings.authors;
    settings.visibleBookmarks = _settings?.visibleBookmarks || settings.visibleBookmarks;
    settings.showFavicon = _settings?.showFavicon !== undefined ? _settings.showFavicon : settings.showFavicon;
    await StorageSync.set('settings', settings);
    _settings = settings;
    _updateTagsIndex();
  }

  function getColumns() {
    return _columns;
  }

  function getSettings() {
    return _settings;
  }

  function _onFilterChange() {
    _renderBoard();
    _updateClearButton();
  }

  function _getDefaultSettings() {
    return Object.assign(getDefaultSettings(), {
      performers: KanbanConstants.DEFAULT_PERFORMERS.map(p => ({ ...p, id: generateId() })),
      tags: KanbanConstants.DEFAULT_TAGS.map(t => ({ ...t, id: generateId() })),
      columns: _createDefaultColumns()
    });
  }

  function _createDefaultColumns() {
    return KanbanConstants.DEFAULT_COLUMNS.map((c, i) => ({
      id: generateId(),
      title: c.title,
      color: c.color,
      order: i,
      cards: []
    }));
  }

  function _getCardsForColumn(columnId) {
    const col = _columns.find(c => c.id === columnId);
    return col?.cards || [];
  }

  function _updateColumnCounts() {
    if (!_dom.board) return;
    _dom.board.querySelectorAll('.kanban-column').forEach(colEl => {
      const colId = colEl.dataset.columnId;
      const cards = KanbanFilter.filterCards(_getCardsForColumn(colId));
      const countEl = colEl.querySelector('.column-count');
      if (countEl) countEl.textContent = cards.length;
    });
  }

  function _renderBoard() {
    const board = _dom.board;
    if (!board) return;

    const sorted = [..._columns].sort((a, b) => (a.order || 0) - (b.order || 0));

    const existingCols = new Map();
    board.querySelectorAll(':scope > .kanban-column').forEach(el => {
      existingCols.set(el.dataset.columnId, el);
    });

    const removeIds = new Set(existingCols.keys());
    let insertBeforeEl = null;

    for (let i = sorted.length - 1; i >= 0; i--) {
      const col = sorted[i];
      removeIds.delete(col.id);

      const existing = existingCols.get(col.id);
      if (existing) {
        _updateColumnElement(existing, col);
      } else {
        const colEl = _createColumnElement(col);
        if (insertBeforeEl) {
          board.insertBefore(colEl, insertBeforeEl);
        } else {
          board.appendChild(colEl);
        }
        existingCols.set(col.id, colEl);
      }
      insertBeforeEl = existingCols.get(col.id) || insertBeforeEl;
    }

    for (const id of removeIds) {
      const el = existingCols.get(id);
      if (el) el.remove();
    }

    let addBtn = board.querySelector(':scope > .add-column-btn');
    if (!addBtn) {
      addBtn = document.createElement('button');
      addBtn.className = 'add-column-btn';
      addBtn.textContent = I18n.t('column.add.column');
      addBtn.addEventListener('click', () => _addColumn());
      board.appendChild(addBtn);
    }

    _bindColumnHeaderDrag();
  }

  function _updateColumnElement(colEl, col) {
    const header = colEl.querySelector('.column-header');
    if (header) header.draggable = true;

    const titleContainer = colEl.querySelector('.column-title');
    if (titleContainer) {
      let colorDot = titleContainer.querySelector('.column-color-indicator');
      if (!colorDot) {
        colorDot = document.createElement('span');
        colorDot.className = 'column-color-indicator';
        titleContainer.prepend(colorDot);
      }
      colorDot.style.background = col.color || '#6366f1';

      let titleText = titleContainer.querySelector('span:not(.column-color-indicator)');
      if (!titleText) {
        titleText = document.createElement('span');
        titleContainer.appendChild(titleText);
      }
      if (titleText.textContent !== col.title) {
        titleText.textContent = col.title;
      }
    }

    const count = colEl.querySelector('.column-count');
    const filteredCards = KanbanFilter.filterCards(_getCardsForColumn(col.id));
    if (count && count.textContent !== String(filteredCards.length)) {
      count.textContent = filteredCards.length;
    }

    const cardsContainer = colEl.querySelector('.column-cards');
    if (cardsContainer) {
      _syncCardsContainer(cardsContainer, col, filteredCards);
    }
  }

  function _syncCardsContainer(container, col, filteredCards) {
    const existingCards = container.querySelectorAll(':scope > .kanban-card');
    const existingMap = new Map();
    existingCards.forEach(el => existingMap.set(el.dataset.cardId, el));

    const removeCardIds = new Set(existingMap.keys());
    let insertBeforeCard = null;

    for (let i = filteredCards.length - 1; i >= 0; i--) {
      const card = filteredCards[i];
      removeCardIds.delete(card.id);

      const existing = existingMap.get(card.id);
      if (existing) {
        _updateCardElement(existing, card, col.id);
        if (existing.nextElementSibling !== insertBeforeCard) {
          if (insertBeforeCard) {
            container.insertBefore(existing, insertBeforeCard);
          } else {
            container.appendChild(existing);
          }
        }
      } else {
        const cardEl = KanbanCard.create(card, col.id, _settings);
        _bindCardDrag(cardEl);
        cardEl.addEventListener('click', () => _openEditCardModal(card, col.id));
        if (insertBeforeCard) {
          container.insertBefore(cardEl, insertBeforeCard);
        } else {
          container.appendChild(cardEl);
        }
        existingMap.set(card.id, cardEl);
      }
      insertBeforeCard = existingMap.get(card.id) || insertBeforeCard;
    }

    for (const id of removeCardIds) {
      const el = existingMap.get(id);
      if (el) el.remove();
    }

    let addCardBtn = container.parentElement.querySelector(':scope > .column-add-card');
    if (!addCardBtn) {
      addCardBtn = document.createElement('button');
      addCardBtn.className = 'column-add-card';
      addCardBtn.textContent = I18n.t('column.add.card');
      container.parentElement.appendChild(addCardBtn);
    }
    addCardBtn.onclick = () => _openNewCardModal(col.id);
  }

  function _updateCardElement(cardEl, card, columnId) {
    cardEl.dataset.columnId = columnId;

    const priorityBar = cardEl.querySelector('.card-priority-bar');
    if (card.priority) {
      const cls = 'card-priority-bar priority-' + card.priority;
      if (!priorityBar) {
        const bar = document.createElement('div');
        bar.className = cls;
        cardEl.prepend(bar);
      } else if (priorityBar.className !== cls) {
        priorityBar.className = cls;
      }
    } else if (priorityBar) {
      priorityBar.remove();
    }

    const titleEl = cardEl.querySelector('.card-title');
    if (titleEl && titleEl.textContent !== card.title) {
      titleEl.textContent = card.title;
    }

    const descEl = cardEl.querySelector('.card-description');
    if (card.description) {
      if (!descEl) {
        const d = document.createElement('div');
        d.className = 'card-description';
        d.textContent = card.description;
        cardEl.insertBefore(d, cardEl.querySelector('.card-meta'));
      } else if (descEl.textContent !== card.description) {
        descEl.textContent = card.description;
      }
    } else if (descEl) {
      descEl.remove();
    }

    const meta = cardEl.querySelector('.card-meta');
    if (meta) {
      const dateEl = meta.querySelector('.card-date');
      if (card.createdAt) {
        const dateStr = new Date(card.createdAt).toLocaleDateString(I18n.localeToBCP47(I18n.getLang()), { day: '2-digit', month: '2-digit' });
        if (!dateEl) {
          const d = document.createElement('span');
          d.className = 'card-date';
          d.textContent = dateStr;
          meta.prepend(d);
        } else if (dateEl.textContent !== dateStr) {
          dateEl.textContent = dateStr;
        }
      } else if (dateEl) {
        dateEl.remove();
      }

      const badge = meta.querySelector('.card-priority-badge');
      if (card.priority) {
        const cls = 'card-priority-badge priority-' + card.priority;
        const label = KanbanConstants.getPriorityLabel(card.priority);
        if (!badge) {
          const b = document.createElement('span');
          b.className = cls;
          b.textContent = label;
          meta.appendChild(b);
        } else {
          if (badge.className !== cls) badge.className = cls;
          if (badge.textContent !== label) badge.textContent = label;
        }
      } else if (badge) {
        badge.remove();
      }
    }

    const assigneeEl = cardEl.querySelector('.card-assignee');
    if (card.assignee) {
      if (!assigneeEl) {
        const ae = document.createElement('div');
        ae.className = 'card-assignee';
        cardEl.appendChild(ae);
      }
      const target = cardEl.querySelector('.card-assignee');
      const avatar = target ? target.querySelector('.assignee-avatar') : null;
      if (avatar) {
        const performer = (_settings?.performers || []).find(p => p.name === card.assignee);
        const bg = performer ? performer.color : KanbanCard._hashToColor(card.assignee);
        if (avatar.style.background !== bg) avatar.style.background = bg;
        if (avatar.textContent !== card.assignee.charAt(0).toUpperCase()) avatar.textContent = card.assignee.charAt(0).toUpperCase();
        if (avatar.title !== card.assignee) avatar.title = card.assignee;
      }
    } else if (assigneeEl) {
      assigneeEl.remove();
    }

    const tagsContainer = cardEl.querySelector('.card-tags');
    if (card.tags && card.tags.length > 0) {
      const displayTags = KanbanCard._getTagsForDisplay(card.tags, _settings, _tagById);
      if (!tagsContainer) {
        const tc = document.createElement('div');
        tc.className = 'card-tags';
        for (const tag of displayTags) {
          const badge = document.createElement('span');
          badge.className = 'tag-badge';
          badge.textContent = tag.name;
          badge.style.background = tag.color;
          tc.appendChild(badge);
        }
        cardEl.appendChild(tc);
      } else {
        const existingBadges = tagsContainer.querySelectorAll(':scope > .tag-badge');
        const badgeMap = new Map();
        existingBadges.forEach(b => badgeMap.set(b.textContent, b));

        const neededNames = new Set(displayTags.map(t => t.name));
        for (const name of badgeMap.keys()) {
          if (!neededNames.has(name)) {
            badgeMap.get(name).remove();
          }
        }
        for (const tag of displayTags) {
          if (!badgeMap.has(tag.name)) {
            const badge = document.createElement('span');
            badge.className = 'tag-badge';
            badge.textContent = tag.name;
            badge.style.background = tag.color;
            tagsContainer.appendChild(badge);
          }
        }
      }
    } else if (tagsContainer) {
      tagsContainer.remove();
    }
  }

  function _createColumnElement(col) {
    const colEl = document.createElement('div');
    colEl.className = 'kanban-column';
    colEl.dataset.columnId = col.id;

    const header = document.createElement('div');
    header.className = 'column-header';
    header.draggable = true;

    const titleContainer = document.createElement('div');
    titleContainer.className = 'column-title';

    const colorDot = document.createElement('span');
    colorDot.className = 'column-color-indicator';
    colorDot.style.background = col.color || '#6366f1';

    const titleText = document.createElement('span');
    titleText.textContent = col.title;

    titleContainer.appendChild(colorDot);
    titleContainer.appendChild(titleText);

    const count = document.createElement('span');
    count.className = 'column-count';
    count.textContent = (col.cards || []).length;

    const actions = document.createElement('div');
    actions.className = 'column-actions';

    const clearBtn = document.createElement('button');
    clearBtn.className = 'column-action-btn clear';
    clearBtn.innerHTML = '&#9003;';
    clearBtn.title = I18n.t('column.clear.cards');
    clearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      _clearColumnCards(col.id);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'column-action-btn delete';
    deleteBtn.innerHTML = '&times;';
    deleteBtn.title = I18n.t('column.delete');
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      _deleteColumn(col.id);
    });

    actions.appendChild(clearBtn);
    actions.appendChild(deleteBtn);

    header.appendChild(titleContainer);
    header.appendChild(count);
    header.appendChild(actions);

    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'column-cards';
    cardsContainer.dataset.columnId = col.id;

    const cards = KanbanFilter.filterCards(_getCardsForColumn(col.id));
    const fragment = document.createDocumentFragment();
    for (const card of cards) {
      const cardEl = KanbanCard.create(card, col.id, _settings);
      _bindCardDrag(cardEl);
      cardEl.addEventListener('click', () => _openEditCardModal(card, col.id));
      fragment.appendChild(cardEl);
    }
    cardsContainer.appendChild(fragment);

    const addCardBtn = document.createElement('button');
    addCardBtn.className = 'column-add-card';
    addCardBtn.textContent = I18n.t('column.add.card');
    addCardBtn.addEventListener('click', () => _openNewCardModal(col.id));

    colEl.appendChild(header);
    colEl.appendChild(cardsContainer);
    colEl.appendChild(addCardBtn);

    _bindColumnDragDrop(colEl, cardsContainer, col.id);

    return colEl;
  }

  function _bindCardDrag(cardEl) {
    cardEl.addEventListener('dragstart', (e) => {
      _draggedCard = {
        cardId: cardEl.dataset.cardId,
        fromColumnId: cardEl.dataset.columnId
      };
      cardEl.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', cardEl.dataset.cardId);
      e.dataTransfer.setDragImage(cardEl, e.offsetX, e.offsetY);
    });

    cardEl.addEventListener('dragend', () => {
      cardEl.classList.remove('dragging');
      _draggedCard = null;
      document.querySelectorAll('.drop-placeholder').forEach(p => p.remove());
    });
  }

  function _bindColumnDragDrop(colEl, cardsContainer, columnId) {
    cardsContainer.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';

      const afterElement = _rafGetDragAfterElement(cardsContainer, e.clientY, '.kanban-card:not(.dragging)');
      let placeholder = cardsContainer.querySelector('.drop-placeholder');
      if (!placeholder) {
        placeholder = KanbanCard.createPlaceholder();
      }
      if (afterElement == null) {
        cardsContainer.appendChild(placeholder);
      } else {
        cardsContainer.insertBefore(placeholder, afterElement);
      }
    });

    cardsContainer.addEventListener('dragleave', (e) => {
      if (!cardsContainer.contains(e.relatedTarget)) {
        const placeholder = cardsContainer.querySelector('.drop-placeholder');
        if (placeholder) placeholder.remove();
      }
    });

    cardsContainer.addEventListener('drop', (e) => {
      e.preventDefault();
      if (!_draggedCard) return;

      const { cardId, fromColumnId } = _draggedCard;
      if (fromColumnId === columnId) {
        _reorderCardInColumn(columnId, cardId);
      } else {
        _moveCard(fromColumnId, columnId, cardId);
      }

      document.querySelectorAll('.drop-placeholder').forEach(p => p.remove());
      _renderBoard();
      save();
      _draggedCard = null;
    });

    colEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      colEl.classList.add('drag-over-column');
    });

    colEl.addEventListener('dragleave', (e) => {
      if (!colEl.contains(e.relatedTarget)) {
        colEl.classList.remove('drag-over-column');
      }
    });

    colEl.addEventListener('dragenter', () => {
      colEl.classList.add('drag-over-column');
    });

    colEl.addEventListener('drop', (e) => {
      e.preventDefault();
      colEl.classList.remove('drag-over-column');
    });
  }

  function _moveCard(fromColumnId, toColumnId, cardId) {
    const fromCol = _columns.find(c => c.id === fromColumnId);
    const toCol = _columns.find(c => c.id === toColumnId);
    if (!fromCol || !toCol) return;

    const cardIndex = fromCol.cards.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return;

    const [card] = fromCol.cards.splice(cardIndex, 1);

    const placeholder = document.querySelector('.kanban-column[data-column-id="' + toColumnId + '"] .drop-placeholder');
    let insertIndex;
    if (placeholder) {
      const prevSibling = placeholder.previousElementSibling;
      if (prevSibling && prevSibling.classList.contains('kanban-card')) {
        const prevCardId = prevSibling.dataset.cardId;
        const prevIndex = toCol.cards.findIndex(c => c.id === prevCardId);
        insertIndex = prevIndex !== -1 ? prevIndex + 1 : toCol.cards.length;
      } else {
        const firstVisible = placeholder.parentElement.querySelector('.kanban-card');
        if (firstVisible) {
          const firstCardId = firstVisible.dataset.cardId;
          const firstIndex = toCol.cards.findIndex(c => c.id === firstCardId);
          insertIndex = firstIndex !== -1 ? firstIndex : 0;
        } else {
          insertIndex = toCol.cards.length;
        }
      }
    } else {
      insertIndex = toCol.cards.length;
    }

    toCol.cards.splice(insertIndex, 0, card);

    toCol.cards.forEach((c, i) => { c.order = i; });
  }

  function _reorderCardInColumn(columnId, cardId) {
    const col = _columns.find(c => c.id === columnId);
    if (!col) return;

    const placeholder = document.querySelector('.kanban-column[data-column-id="' + columnId + '"] .drop-placeholder');
    if (!placeholder) return;

    const prevSibling = placeholder.previousElementSibling;
    let insertIndex;
    if (prevSibling && prevSibling.classList.contains('kanban-card')) {
      const prevCardId = prevSibling.dataset.cardId;
      const prevIndex = col.cards.findIndex(c => c.id === prevCardId);
      insertIndex = prevIndex !== -1 ? prevIndex + 1 : col.cards.length;
    } else {
      insertIndex = 0;
    }

    const cardIndex = col.cards.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return;
    const [card] = col.cards.splice(cardIndex, 1);

    const adjustedIndex = cardIndex < insertIndex ? insertIndex - 1 : insertIndex;
    col.cards.splice(adjustedIndex, 0, card);

    col.cards.forEach((c, i) => { c.order = i; });
  }

  function _bindColumnReorder(board) {
    let _colRafId = null;
    let _pendingColReorderX = 0;
    let _colRafResult = { element: null };

    board.addEventListener('dragover', (e) => {
      if (!_draggedColumn) return;
      e.preventDefault();

      if (!_colRafId) {
        _colRafId = requestAnimationFrame(() => {
          _colRafId = null;
          const columns = [...board.querySelectorAll('.kanban-column')];
          _colRafResult = columns.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = _pendingColReorderX - box.left - box.width / 2;
            if (offset < 0 && offset > closest.offset) {
              return { offset, element: child };
            }
            return closest;
          }, { offset: Number.NEGATIVE_INFINITY });
        });
      }
      _pendingColReorderX = e.clientX;

      const afterElement = _colRafResult.element;
      const draggingCol = board.querySelector('.kanban-column.dragging');
      if (!draggingCol) return;

      if (afterElement == null) {
        board.appendChild(draggingCol);
      } else {
        board.insertBefore(draggingCol, afterElement);
      }
    });

    board.addEventListener('drop', (e) => {
      if (!_draggedColumn) return;
      e.preventDefault();

      const columnEls = [...board.querySelectorAll('.kanban-column')];
      const columnIds = columnEls.map(el => el.dataset.columnId);
      const newColumns = [];
      for (const id of columnIds) {
        const orig = _columns.find(c => c.id === id);
        if (orig) newColumns.push(orig);
      }
      _columns = newColumns;

      save();
      _draggedColumn = null;
    });
  }

  function _bindColumnHeaderDrag() {
    const board = _dom.board;
    if (!board) return;
    board.querySelectorAll('.kanban-column .column-header').forEach(header => {
      header.addEventListener('dragstart', (e) => {
        const colEl = header.closest('.kanban-column');
        if (!colEl) return;
        _draggedColumn = colEl.dataset.columnId;
        colEl.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', 'column:' + colEl.dataset.columnId);
      });

      header.addEventListener('dragend', () => {
        _draggedColumn = null;
        document.querySelectorAll('.kanban-column').forEach(c => c.classList.remove('dragging'));
        document.querySelectorAll('.drag-over-column').forEach(c => c.classList.remove('drag-over-column'));
      });
    });
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
    _populateTagSelector(card ? (card.tags || []) : []);
    _closeTagsDropdown();
    _dom.modal.style.display = 'flex';
    setTimeout(() => _dom.cardTitle.focus(), 50);
  }

  function _closeModal() {
    _dom.modal.style.display = 'none';
    _editingCard = null;
    _editingColumnId = null;
  }

  function _populateTagSelector(selectedTagIds) {
    const container = _dom.cardTagsSelector;
    if (!container) return;
    container.innerHTML = '';
    const tags = _settings?.tags || [];
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
    const tags = _settings?.tags || [];
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
    const performers = _settings?.performers || [];
    const fragment = document.createDocumentFragment();
    for (const performer of performers) {
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
    const authors = _settings?.authors || [];
    const fragment = document.createDocumentFragment();
    for (const author of authors) {
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
      const col = _columns.find(c => c.id === _editingColumnId);
      if (col) {
        const card = col.cards.find(c => c.id === _editingCard.id);
        if (card) {
          Object.assign(card, { title, description, priority, assignee, author, tags: selectedTags, updatedAt: Date.now() });
        }
      }
    } else {
      const col = _columns.find(c => c.id === _editingColumnId);
      if (col) {
        col.cards.push({
          id: generateId(),
          title, description, priority, assignee, author,
          tags: selectedTags,
          order: col.cards.length,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      }
    }

    _closeModal();
    _renderBoard();
    _renderFilterUI();
    save();
  }

  function _deleteCard() {
    if (!_editingCard || _editingCard._isTemporary) return;
    if (!confirm(I18n.t('column.delete.card.confirm', { title: escapeHtml(_editingCard.title) }))) return;

    const col = _columns.find(c => c.id === _editingColumnId);
    if (col) {
      col.cards = col.cards.filter(c => c.id !== _editingCard.id);
    }

    _closeModal();
    _renderBoard();
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

      const newCol = {
        id: generateId(),
        title: title,
        color: color,
        order: _columns.length,
        cards: []
      };

      _columns.push(newCol);

      _renderBoard();
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
    const col = _columns.find(c => c.id === columnId);
    if (!col) return;
    if (!col.cards || col.cards.length === 0) return;

    const lang = I18n.getLang();
    const phraseMap = { ru: 'очистить', en: 'clear', zh: '清空' };
    const phrase = phraseMap[lang] || 'clear';

    const input = prompt(I18n.t('column.clear.cards.confirm', { phrase }), '');
    if (input === null) return;

    if (input.trim().toLowerCase() !== phrase.toLowerCase()) {
      alert(I18n.t('column.clear.cards.wrong'));
      return;
    }

    col.cards = [];
    _renderBoard();
    save();
  }

  function _deleteColumn(columnId) {
    const col = _columns.find(c => c.id === columnId);
    if (!col) return;
    if (_columns.length <= 1) return;

    if (!confirm(I18n.t('column.delete.confirm', { title: escapeHtml(col.title) }))) return;

    _columns = _columns.filter(c => c.id !== columnId);
    _renderBoard();
    save();
  }

  function _renderFilterUI() {
    const assigneeSelect = _dom.filterAssignee;
    if (!assigneeSelect) return;

    const performers = _settings?.performers || [];
    const currentAssignee = assigneeSelect.value;
    assigneeSelect.innerHTML = '<option value="">' + I18n.t('filter.all.assignees') + '</option>';
    for (const performer of performers) {
      const opt = document.createElement('option');
      opt.value = performer.name;
      opt.textContent = performer.name;
      if (performer.name === currentAssignee) opt.selected = true;
      assigneeSelect.appendChild(opt);
    }

    _renderTagsDropdown();
    _renderTagsChips();
  }

  function _renderTagsDropdown() {
    const listEl = _dom.filterTagsList;
    const labelEl = _dom.filterTagsLabel;
    if (!listEl || !labelEl) return;

    listEl.innerHTML = '';
    const allTags = _settings?.tags || [];

    if (allTags.length === 0) {
      listEl.innerHTML = '<div class="filter-tag-item" style="cursor:default;opacity:0.5">' + I18n.t('column.no.tags') + '</div>';
      _updateFilterTagsLabel(labelEl);
      return;
    }

    const fragment = document.createDocumentFragment();
    const filterState = KanbanFilter.getState();

    for (const tag of allTags) {
      const item = document.createElement('div');
      item.className = 'filter-tag-item' + (filterState.tags.includes(tag.id) ? ' selected' : '');
      item.dataset.tagId = tag.id;

      const checkbox = document.createElement('span');
      checkbox.className = 'filter-tag-checkbox';
      const colorDot = document.createElement('span');
      colorDot.className = 'filter-tag-color';
      colorDot.style.background = tag.color;
      const nameSpan = document.createElement('span');
      nameSpan.className = 'filter-tag-name';
      nameSpan.textContent = tag.name;

      item.appendChild(checkbox);
      item.appendChild(colorDot);
      item.appendChild(nameSpan);
      item.addEventListener('click', () => {
        KanbanFilter.toggleTag(tag.id);
        _renderBoard();
        _updateClearButton();
        _renderTagsDropdown();
        _renderTagsChips();
        save();
      });
      fragment.appendChild(item);
    }

    listEl.appendChild(fragment);
    _updateFilterTagsLabel(labelEl);
  }

  function _updateFilterTagsLabel(labelEl) {
    const filterState = KanbanFilter.getState();
    if (filterState.tags.length > 0) {
      labelEl.textContent = I18n.t('tags.filter.selected', { count: filterState.tags.length });
    } else {
      labelEl.textContent = I18n.t('tags.filter.all');
    }
  }

  function _renderTagsChips() {
    const chipsEl = _dom.filterTagsChips;
    if (!chipsEl) return;
    chipsEl.innerHTML = '';

    const allTags = _settings?.tags || [];
    const filterState = KanbanFilter.getState();

    for (const tagId of filterState.tags) {
      const tag = allTags.find(t => t.id === tagId);
      if (!tag) continue;

      const chip = document.createElement('span');
      chip.className = 'filter-tag-chip';
      chip.style.background = tag.color + '22';
      chip.style.color = tag.color;
      chip.style.border = '1px solid ' + tag.color + '55';
      chip.innerHTML = `<span class="filter-tag-name">${escapeHtml(tag.name)}</span><span class="filter-tag-chip-remove" title="${I18n.t('tags.remove.title')}">&#10005;</span>`;
      chip.querySelector('.filter-tag-chip-remove').addEventListener('click', (e) => {
        e.stopPropagation();
        KanbanFilter.removeTag(tagId);
        _renderBoard();
        _updateClearButton();
        _renderTagsDropdown();
        _renderTagsChips();
        save();
      });
      chipsEl.appendChild(chip);
    }
  }

  function _updateClearButton() {
    const btn = _dom.filterClear;
    if (!btn) return;
    btn.classList.toggle('visible', KanbanFilter.hasActiveFilters());
  }

  function _bindEvents() {
    _bindColumnReorder(_dom.board);

    document.getElementById('card-save').addEventListener('click', () => _saveCard());
    document.getElementById('card-cancel').addEventListener('click', () => _closeModal());
    _dom.cardDeleteBtn.addEventListener('click', () => _deleteCard());

    _dom.cardTitle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') _saveCard();
      if (e.key === 'Escape') _closeModal();
    });

    _dom.modal.addEventListener('click', (e) => {
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
    const filterClear = _dom.filterClear;

    if (filterSearch) {
      let _searchTimer = null;
      filterSearch.addEventListener('input', () => {
        if (_searchTimer) clearTimeout(_searchTimer);
        _searchTimer = setTimeout(() => {
          _searchTimer = null;
          KanbanFilter.applyFilters(filterSearch.value, filterPriority?.value || '', filterAssignee?.value || '');
          _renderBoard();
          _updateClearButton();
          save();
        }, 150);
      });
    }
    if (filterPriority) {
      filterPriority.addEventListener('change', () => {
        KanbanFilter.applyFilters(filterSearch?.value || '', filterPriority.value, filterAssignee?.value || '');
        _renderBoard();
        _updateClearButton();
        save();
      });
    }
    if (filterAssignee) {
      filterAssignee.addEventListener('change', () => {
        KanbanFilter.applyFilters(filterSearch?.value || '', filterPriority?.value || '', filterAssignee.value);
        _renderBoard();
        _updateClearButton();
        save();
      });
    }
    if (filterClear) {
      filterClear.addEventListener('click', () => {
        KanbanFilter.clear();
        if (filterSearch) filterSearch.value = '';
        if (filterPriority) filterPriority.value = '';
        if (filterAssignee) filterAssignee.value = '';
        _renderBoard();
        _renderFilterUI();
        _updateClearButton();
        save();
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
        if (!isVisible) _renderTagsDropdown();
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

  return { init, save, getColumns, getSettings };
})();
