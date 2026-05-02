'use strict';

const KanbanBoard = (() => {
  let _columns = [];
  let _settings = null;
  let _editingCard = null;
  let _editingColumnId = null;
  let _draggedCard = null;
  let _draggedColumn = null;

  async function init() {
    _settings = await StorageSync.get('settings') || _getDefaultSettings();
    const saved = await StorageLocal.get(KanbanConstants.STORAGE_KEY);
    _columns = saved && saved.columns ? saved.columns : _createDefaultColumns();
    _columns.forEach(col => col.cards = col.cards || []);

    KanbanFilter.init(
      _settings.kanbanFilter || { search: '', priority: '', assignee: '', tags: [] },
      _onFilterChange
    );

    _renderBoard();
    _bindEvents();
    _renderFilterUI();
    _updateClearButton();
  }

  async function save() {
    _columns.forEach((col, i) => { col.order = i; });
    await StorageLocal.set(KanbanConstants.STORAGE_KEY, { columns: _columns });

    const settings = await StorageSync.get('settings') || _getDefaultSettings();
    settings.columns = _columns;
    settings.kanbanFilter = KanbanFilter.toJSON();
    settings.theme = _settings?.theme || settings.theme;
    settings.cardSize = _settings?.cardSize || settings.cardSize;
    settings.tags = _settings?.tags || settings.tags;
    settings.performers = _settings?.performers || settings.performers;
    settings.authors = _settings?.authors || settings.authors;
    settings.visibleBookmarks = _settings?.visibleBookmarks || settings.visibleBookmarks;
    settings.showFavicon = _settings?.showFavicon !== undefined ? _settings.showFavicon : settings.showFavicon;
    await StorageSync.set('settings', settings);
    _settings = settings;
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
    return {
      theme: 'system',
      cardSize: 'standard',
      showFavicon: true,
      visibleBookmarks: [],
      performers: [
        { id: generateId(), name: 'Иванов И.И.', color: '#6366f1' },
        { id: generateId(), name: 'Петров П.П.', color: '#22c55e' },
        { id: generateId(), name: 'Сидоров С.С.', color: '#f59e0b' }
      ],
      tags: [
        { id: generateId(), name: 'Bug', color: '#ef4444' },
        { id: generateId(), name: 'Feature', color: '#3b82f6' },
        { id: generateId(), name: 'Enhancement', color: '#8b5cf6' }
      ],
      authors: [],
      kanbanFilter: {},
      columns: _createDefaultColumns()
    };
  }

  function generateId() {
    return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2);
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
    return (col?.cards || []).sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  function _updateColumnCounts() {
    document.querySelectorAll('.kanban-column').forEach(colEl => {
      const colId = colEl.dataset.columnId;
      const cards = KanbanFilter.filterCards(_getCardsForColumn(colId));
      const countEl = colEl.querySelector('.column-count');
      if (countEl) countEl.textContent = cards.length;
    });
  }

  function _renderBoard() {
    const board = document.getElementById('kanban-board');
    if (!board) return;
    board.innerHTML = '';

    const sorted = [..._columns].sort((a, b) => (a.order || 0) - (b.order || 0));
    for (const col of sorted) {
      board.appendChild(_createColumnElement(col));
    }

    _updateColumnCounts();

    const addColBtn = document.createElement('button');
    addColBtn.className = 'add-column-btn';
    addColBtn.textContent = '+ Добавить колонку';
    addColBtn.addEventListener('click', () => _addColumn());
    board.appendChild(addColBtn);
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
    titleText.style.flex = '1';
    titleText.style.overflow = 'hidden';
    titleText.style.textOverflow = 'ellipsis';
    titleText.style.whiteSpace = 'nowrap';

    titleContainer.appendChild(colorDot);
    titleContainer.appendChild(titleText);

    const count = document.createElement('span');
    count.className = 'column-count';
    count.textContent = (col.cards || []).length;

    const actions = document.createElement('div');
    actions.className = 'column-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'column-action-btn';
    editBtn.innerHTML = '&#9998;';
    editBtn.title = 'Редактировать';
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      _editColumn(col.id);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'column-action-btn delete';
    deleteBtn.innerHTML = '&times;';
    deleteBtn.title = 'Удалить';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      _deleteColumn(col.id);
    });

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    header.appendChild(titleContainer);
    header.appendChild(count);
    header.appendChild(actions);

    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'column-cards';
    cardsContainer.dataset.columnId = col.id;

    const cards = KanbanFilter.filterCards(_getCardsForColumn(col.id));
    for (const card of cards) {
      const cardEl = KanbanCard.create(card, col.id, _settings);
      _bindCardDrag(cardEl);
      cardEl.addEventListener('click', () => _openEditCardModal(card, col.id));
      cardsContainer.appendChild(cardEl);
    }

    const addCardBtn = document.createElement('button');
    addCardBtn.className = 'column-add-card';
    addCardBtn.textContent = '+ Добавить задачу';
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
    });

    cardEl.addEventListener('dragend', () => {
      cardEl.classList.remove('dragging');
      _draggedCard = null;
      document.querySelectorAll('.drop-placeholder').forEach(p => p.remove());
      document.querySelectorAll('.drag-over-card').forEach(c => c.classList.remove('drag-over-card'));
    });
  }

  function _bindColumnDragDrop(colEl, cardsContainer, columnId) {
    cardsContainer.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';

      const afterElement = getCardDragAfterElement(cardsContainer, e.clientY);
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
  }

  function _reorderCardInColumn(columnId, cardId) {
    const col = _columns.find(c => c.id === columnId);
    if (!col) return;

    const cardIndex = col.cards.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return;

    const placeholder = document.querySelector('.kanban-column[data-column-id="' + columnId + '"] .drop-placeholder');
    if (!placeholder) return;

    const card = col.cards[cardIndex];

    const prevSibling = placeholder.previousElementSibling;
    let newIndex;
    if (prevSibling && prevSibling.classList.contains('kanban-card')) {
      const prevCardId = prevSibling.dataset.cardId;
      const prevIndex = col.cards.findIndex(c => c.id === prevCardId);
      if (prevIndex === -1) {
        newIndex = col.cards.length;
      } else {
        if (cardIndex < prevIndex) {
          newIndex = prevIndex;
        } else {
          newIndex = prevIndex + 1;
        }
      }
    } else {
      const firstVisible = placeholder.parentElement.querySelector('.kanban-card');
      if (firstVisible) {
        const firstCardId = firstVisible.dataset.cardId;
        const firstIndex = col.cards.findIndex(c => c.id === firstCardId);
        newIndex = firstIndex !== -1 ? firstIndex : 0;
      } else {
        newIndex = 0;
      }
    }

    col.cards.splice(cardIndex, 1);
    col.cards.splice(newIndex, 0, card);
  }

  function _bindColumnReorder(board) {
    board.addEventListener('dragover', (e) => {
      if (!_draggedColumn) return;
      e.preventDefault();

      const columns = [...board.querySelectorAll('.kanban-column')];
      const afterElement = columns.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = e.clientX - box.left - box.width / 2;
        if (offset < 0 && offset > closest.offset) {
          return { offset, element: child };
        }
        return closest;
      }, { offset: Number.NEGATIVE_INFINITY }).element;

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
    _populateModal('Новая задача', columnId, null);
  }

  function _openEditCardModal(card, columnId) {
    if (card._isTemporary) return;
    _editingCard = { ...card, tags: card.tags ? [...card.tags] : [] };
    _editingColumnId = columnId;
    _populateModal('Редактировать задачу', columnId, card);
  }

  function _populateModal(titleText, columnId, card) {
    document.getElementById('modal-title').textContent = titleText;
    document.getElementById('card-title-input').value = card ? (card.title || '') : '';
    document.getElementById('card-desc-input').value = card ? (card.description || '') : '';
    _populateAssigneeSelect(card ? (card.assignee || '') : '');
    _populateAuthorSelect(card ? (card.author || '') : '');
    document.getElementById('card-priority-select').value = card ? (card.priority || '') : '';
    document.getElementById('card-delete-btn').style.display = card ? 'inline-block' : 'none';
    _populateTagSelector(card ? (card.tags || []) : []);
    _closeTagsDropdown();
    document.getElementById('edit-card-modal').style.display = 'flex';
    setTimeout(() => document.getElementById('card-title-input').focus(), 50);
  }

  function _closeModal() {
    document.getElementById('edit-card-modal').style.display = 'none';
    _editingCard = null;
    _editingColumnId = null;
  }

  function _populateTagSelector(selectedTagIds) {
    const container = document.getElementById('card-tags-selector');
    if (!container) return;
    container.innerHTML = '';
    const tags = _settings?.tags || [];
    if (tags.length === 0) {
      container.innerHTML = '<div class="card-tags-empty">Нет тегов</div>';
      _updateTagsDisplay();
      return;
    }
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
      container.appendChild(label);
    }
    _updateTagsDisplay();
  }

  function _updateTagsDisplay() {
    const display = document.getElementById('card-tags-display');
    const selectedContainer = document.getElementById('card-tags-selected');
    if (!display) return;
    display.innerHTML = '';
    selectedContainer.innerHTML = '';
    const checkboxes = document.querySelectorAll('#card-tags-selector input[type="checkbox"]');
    const checkedBoxes = Array.from(checkboxes).filter(cb => cb.checked);
    if (checkedBoxes.length === 0) {
      const placeholder = document.createElement('span');
      placeholder.className = 'tags-placeholder';
      placeholder.textContent = 'Все теги';
      display.appendChild(placeholder);
      return;
    }
    const tags = _settings?.tags || [];
    for (const cb of checkedBoxes) {
      const tag = tags.find(t => t.id === cb.value);
      if (!tag) continue;
      const badge = document.createElement('span');
      badge.className = 'card-selected-tag';
      badge.style.background = tag.color;
      badge.innerHTML = `<span class="card-selected-tag-name">${escapeHtml(tag.name)}</span><span class="card-remove-tag" data-tag-id="${tag.id}" title="Удалить тег">&times;</span>`;
      const removeBtn = badge.querySelector('.card-remove-tag');
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        cb.checked = false;
        _updateTagsDisplay();
      });
      display.appendChild(badge);
      const dropdownBadge = badge.cloneNode(true);
      dropdownBadge.querySelector('.card-remove-tag').addEventListener('click', (e) => {
        e.stopPropagation();
        cb.checked = false;
        _updateTagsDisplay();
      });
      selectedContainer.appendChild(dropdownBadge);
    }
  }

  function _toggleTagsDropdown() {
    const wrapper = document.getElementById('card-tags-dropdown-wrapper');
    const dropdown = document.getElementById('card-tags-dropdown');
    if (!wrapper || !dropdown) return;
    const isActive = wrapper.classList.contains('active');
    wrapper.classList.toggle('active', !isActive);
    dropdown.classList.toggle('active', !isActive);
  }

  function _closeTagsDropdown() {
    const wrapper = document.getElementById('card-tags-dropdown-wrapper');
    const dropdown = document.getElementById('card-tags-dropdown');
    if (wrapper) wrapper.classList.remove('active');
    if (dropdown) dropdown.classList.remove('active');
    const selected = document.getElementById('card-tags-selected');
    if (selected) selected.innerHTML = '';
  }

  function _populateAssigneeSelect(selectedValue) {
    const select = document.getElementById('card-assignee-select');
    if (!select) return;
    select.innerHTML = '<option value="">Не назначен</option>';
    const performers = _settings?.performers || [];
    for (const performer of performers) {
      const opt = document.createElement('option');
      opt.value = performer.name;
      opt.textContent = performer.name;
      if (performer.name === selectedValue) opt.selected = true;
      select.appendChild(opt);
    }
  }

  function _populateAuthorSelect(selectedValue) {
    const select = document.getElementById('card-author-select');
    if (!select) return;
    select.innerHTML = '<option value="">Не указан</option>';
    const authors = _settings?.authors || [];
    for (const author of authors) {
      const opt = document.createElement('option');
      opt.value = author.name;
      opt.textContent = author.name;
      if (author.name === selectedValue) opt.selected = true;
      select.appendChild(opt);
    }
  }

  function _saveCard() {
    const title = document.getElementById('card-title-input').value.trim();
    if (!title) return;

    const description = document.getElementById('card-desc-input').value.trim();
    const priority = document.getElementById('card-priority-select').value;
    const assignee = document.getElementById('card-assignee-select').value;
    const author = document.getElementById('card-author-select').value;

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
    if (!confirm('Удалить задачу "' + _editingCard.title + '"?')) return;

    const col = _columns.find(c => c.id === _editingColumnId);
    if (col) {
      col.cards = col.cards.filter(c => c.id !== _editingCard.id);
    }

    _closeModal();
    _renderBoard();
    save();
  }

  function _addColumn() {
    const newCol = {
      id: generateId(),
      title: 'Новая колонка',
      color: _randomColor(),
      order: _columns.length,
      cards: []
    };
    _columns.push(newCol);
    _renderBoard();
    save();

    const board = document.getElementById('kanban-board');
    const lastCol = board.querySelector('.kanban-column:last-child');
    if (lastCol) {
      const input = lastCol.querySelector('.column-title input');
      if (input) input.focus();
    }
  }

  function _randomColor() {
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}, 60%, 50%)`;
  }

  function _editColumn(columnId) {
    const col = _columns.find(c => c.id === columnId);
    if (!col) return;

    const colEl = document.querySelector('.kanban-column[data-column-id="' + columnId + '"]');
    if (!colEl) return;

    const titleContainer = colEl.querySelector('.column-title');

    titleContainer.innerHTML = '';

    const input = document.createElement('input');
    input.type = 'text';
    input.value = col.title;

    const colorPicker = document.createElement('input');
    colorPicker.type = 'color';
    colorPicker.value = _hslToHex(col.color) || col.color;
    colorPicker.className = 'column-color-picker';

    const saveBtn = document.createElement('button');
    saveBtn.className = 'column-action-btn';
    saveBtn.innerHTML = '&#10003;';
    saveBtn.addEventListener('click', () => {
      col.title = input.value.trim() || 'Без названия';
      col.color = colorPicker.value;
      _renderBoard();
      save();
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'column-action-btn delete';
    cancelBtn.innerHTML = '&times;';
    cancelBtn.addEventListener('click', () => _renderBoard());

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') saveBtn.click();
      if (e.key === 'Escape') cancelBtn.click();
    });

    titleContainer.appendChild(input);
    titleContainer.appendChild(colorPicker);
    titleContainer.appendChild(saveBtn);
    titleContainer.appendChild(cancelBtn);

    input.focus();
    input.select();
  }

  function _hslToHex(hsl) {
    if (!hsl || !hsl.startsWith('hsl')) return null;
    const match = hsl.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (!match) return null;
    const h = parseInt(match[1]) / 360;
    const s = parseInt(match[2]) / 100;
    const l = parseInt(match[3]) / 100;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => {
      const k = (n + h * 12) % 12;
      const color = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  }

  function _deleteColumn(columnId) {
    const col = _columns.find(c => c.id === columnId);
    if (!col) return;
    if (_columns.length <= 1) return;

    if (!confirm('Удалить колонку "' + col.title + '" и все её задачи?')) return;

    _columns = _columns.filter(c => c.id !== columnId);
    _renderBoard();
    save();
  }

  function _renderFilterUI() {
    const assigneeSelect = document.getElementById('filter-assignee');
    if (!assigneeSelect) return;

    const performers = _settings?.performers || [];
    const currentAssignee = assigneeSelect.value;
    assigneeSelect.innerHTML = '<option value="">Все исполнители</option>';
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
    const listEl = document.getElementById('filter-tags-list');
    const labelEl = document.getElementById('filter-tags-label');
    if (!listEl || !labelEl) return;

    listEl.innerHTML = '';
    const allTags = _settings?.tags || [];

    if (allTags.length === 0) {
      listEl.innerHTML = '<div class="filter-tag-item" style="cursor:default;opacity:0.5">Нет тегов</div>';
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
      labelEl.textContent = filterState.tags.length + ' выбрано';
    } else {
      labelEl.textContent = 'Все теги';
    }
  }

  function _renderTagsChips() {
    const chipsEl = document.getElementById('filter-tags-chips');
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
      chip.innerHTML = `<span class="filter-tag-name">${escapeHtml(tag.name)}</span><span class="filter-tag-chip-remove" title="Удалить фильтр">&#10005;</span>`;
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
    const btn = document.getElementById('filter-clear');
    if (!btn) return;
    btn.classList.toggle('visible', KanbanFilter.hasActiveFilters());
  }

  function _bindEvents() {
    const board = document.getElementById('kanban-board');
    if (board) _bindColumnReorder(board);

    document.getElementById('card-save').addEventListener('click', () => _saveCard());
    document.getElementById('card-cancel').addEventListener('click', () => _closeModal());
    document.getElementById('card-delete-btn').addEventListener('click', () => _deleteCard());

    document.getElementById('card-title-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') _saveCard();
      if (e.key === 'Escape') _closeModal();
    });

    document.getElementById('edit-card-modal').addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-overlay')) _closeModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') _closeModal();
    });

    const filterSearch = document.getElementById('filter-search');
    const filterPriority = document.getElementById('filter-priority');
    const filterAssignee = document.getElementById('filter-assignee');
    const filterClear = document.getElementById('filter-clear');

    if (filterSearch) {
      filterSearch.addEventListener('input', () => {
        KanbanFilter.applyFilters(filterSearch.value, filterPriority?.value || '', filterAssignee?.value || '');
        _renderBoard();
        _updateClearButton();
        save();
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

    const tagsLabel = document.getElementById('filter-tags-label');
    if (tagsLabel) {
      tagsLabel.addEventListener('click', () => {
        const dropdown = document.getElementById('filter-tags-dropdown');
        if (!dropdown) return;
        const isVisible = dropdown.style.display === 'block';
        dropdown.style.display = isVisible ? 'none' : 'block';
        tagsLabel.classList.toggle('active', !isVisible);
        if (!isVisible) _renderTagsDropdown();
      });
    }

    document.addEventListener('click', (e) => {
      const dropdown = document.getElementById('filter-tags-dropdown');
      const label = document.getElementById('filter-tags-label');
      if (dropdown && label && !dropdown.contains(e.target) && !label.contains(e.target)) {
        dropdown.style.display = 'none';
        label.classList.remove('active');
      }
    });

    const tagsDisplay = document.getElementById('card-tags-display');
    if (tagsDisplay) {
      tagsDisplay.addEventListener('click', (e) => {
        e.stopPropagation();
        _toggleTagsDropdown();
      });
    }

    const tagsClearBtn = document.getElementById('tags-dropdown-clear');
    if (tagsClearBtn) {
      tagsClearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.card-tag-option input[type="checkbox"]').forEach(cb => cb.checked = false);
        _updateTagsDisplay();
      });
    }

    document.addEventListener('click', (e) => {
      const wrapper = document.getElementById('card-tags-dropdown-wrapper');
      if (wrapper && wrapper.classList.contains('active') && !wrapper.contains(e.target)) {
        _closeTagsDropdown();
      }
    });
  }

  return { init, save, getColumns, getSettings };
})();
