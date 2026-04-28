const KanbanBoard = {
  _columns: [],
  _editingCard: null,
  _editingColumnId: null,
  _draggedCard: null,
  _draggedColumn: null,
  _filterState: { search: '', priority: '', assignee: '', tags: [] },
  _settings: null,

  async init() {
    this._settings = await Storage.get('settings') || Storage.getDefaultSettings();
    this._columns = this._settings.columns || Storage.getDefaultColumns();
    this._columns.forEach(col => col.cards = col.cards || []);
    this._filterState = this._settings.kanbanFilter || { search: '', priority: '', assignee: '', tags: [] };
    this._renderBoard();
    this._bindEvents();
    this._updateFilterDropdowns();
    this._updateClearButton();
  },

  async save() {
    this._columns.forEach((col, i) => { col.order = i; });
    const settings = await Storage.get('settings') || Storage.getDefaultSettings();
    settings.columns = this._columns;
    settings.kanbanFilter = this._filterState;
    await Storage.set('settings', settings);
    this._settings = settings;
  },

  _getCardsForColumn(columnId) {
    const col = this._columns.find(c => c.id === columnId);
    return (col?.cards || []).sort((a, b) => (a.order || 0) - (b.order || 0));
  },

  _getFilteredCardsForColumn(columnId) {
    const cards = this._getCardsForColumn(columnId);
    const f = this._filterState;
    return cards.filter(card => {
      if (f.search) {
        const search = f.search.toLowerCase();
        if (!card.title.toLowerCase().includes(search) &&
            !(card.description || '').toLowerCase().includes(search) &&
            !(card.assignee || '').toLowerCase().includes(search)) {
          return false;
        }
      }
      if (f.priority && (card.priority || '') !== f.priority) {
        return false;
      }
      if (f.assignee && (card.assignee || '') !== f.assignee) {
        return false;
      }
      if (f.tags && f.tags.length > 0) {
        const cardTags = card.tags || [];
        if (!f.tags.some(t => cardTags.includes(t))) {
          return false;
        }
      }
      return true;
    });
  },

  _updateColumnCounts() {
    document.querySelectorAll('.kanban-column').forEach(colEl => {
      const colId = colEl.dataset.columnId;
      const cards = this._getFilteredCardsForColumn(colId);
      const countEl = colEl.querySelector('.column-count');
      if (countEl) {
        countEl.textContent = cards.length;
      }
    });
  },

  _renderBoard() {
    const board = document.getElementById('kanban-board');
    if (!board) return;

    board.innerHTML = '';

    const sorted = [...this._columns].sort((a, b) => (a.order || 0) - (b.order || 0));

    for (const col of sorted) {
      board.appendChild(this._createColumnElement(col));
    }

    this._updateColumnCounts();

    const addColBtn = document.createElement('button');
    addColBtn.className = 'add-column-btn';
    addColBtn.innerHTML = '+ Добавить колонку';
    addColBtn.addEventListener('click', () => this._addColumn());
    board.appendChild(addColBtn);
  },

  _createColumnElement(col) {
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
      this._editColumn(col.id);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'column-action-btn delete';
    deleteBtn.innerHTML = '&times;';
    deleteBtn.title = 'Удалить';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._deleteColumn(col.id);
    });

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    header.appendChild(titleContainer);
    header.appendChild(count);
    header.appendChild(actions);

    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'column-cards';
    cardsContainer.dataset.columnId = col.id;

    const cards = this._getFilteredCardsForColumn(col.id);
    for (const card of cards) {
      cardsContainer.appendChild(this._createCardElement(card, col.id));
    }

    const addCardBtn = document.createElement('button');
    addCardBtn.className = 'column-add-card';
    addCardBtn.textContent = '+ Добавить задачу';
    addCardBtn.addEventListener('click', () => this._openNewCardModal(col.id));

    colEl.appendChild(header);
    colEl.appendChild(cardsContainer);
    colEl.appendChild(addCardBtn);

    this._bindColumnDragDrop(colEl, cardsContainer, col.id);

    return colEl;
  },

  _createCardElement(card, columnId) {
    const cardEl = document.createElement('div');
    cardEl.className = 'kanban-card';
    cardEl.draggable = true;
    cardEl.dataset.cardId = card.id;
    cardEl.dataset.columnId = columnId;

    if (card.priority) {
      const priorityBar = document.createElement('div');
      priorityBar.className = 'card-priority-bar priority-' + card.priority;
      cardEl.appendChild(priorityBar);
    }

    const titleEl = document.createElement('div');
    titleEl.className = 'card-title';
    titleEl.textContent = card.title;
    cardEl.appendChild(titleEl);

    if (card.description) {
      const descEl = document.createElement('div');
      descEl.className = 'card-description';
      descEl.textContent = card.description;
      cardEl.appendChild(descEl);
    }

    const meta = document.createElement('div');
    meta.className = 'card-meta';

    if (card.createdAt) {
      const dateEl = document.createElement('span');
      dateEl.className = 'card-date';
      const d = new Date(card.createdAt);
      dateEl.textContent = d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
      meta.appendChild(dateEl);
    }

    if (card.priority) {
      const badge = document.createElement('span');
      badge.className = 'card-priority-badge priority-' + card.priority;
      const labels = { low: 'Низкий', medium: 'Средний', high: 'Высокий', urgent: 'Срочный' };
      badge.textContent = labels[card.priority] || '';
      meta.appendChild(badge);
    }

    cardEl.appendChild(meta);

    if (card.assignee) {
      const assigneeEl = document.createElement('div');
      assigneeEl.className = 'card-assignee';
      const initial = card.assignee.charAt(0).toUpperCase();
      const avatar = document.createElement('span');
      avatar.className = 'assignee-avatar';
      avatar.style.background = this._hashToColor(card.assignee);
      avatar.textContent = initial;
      avatar.title = card.assignee;
      assigneeEl.appendChild(avatar);
      cardEl.appendChild(assigneeEl);
    }

    if (card.tags && card.tags.length > 0) {
      const tagsContainer = document.createElement('div');
      tagsContainer.className = 'card-tags';
      const tags = this._getTagsForDisplay(card.tags);
      for (const tag of tags) {
        const badge = document.createElement('span');
        badge.className = 'tag-badge';
        badge.textContent = tag.name;
        badge.style.background = tag.color;
        tagsContainer.appendChild(badge);
      }
      cardEl.appendChild(tagsContainer);
    }

    cardEl.addEventListener('click', () => this._openEditCardModal(card, columnId));

    this._bindCardDrag(cardEl);

    return cardEl;
  },

  _bindCardDrag(cardEl) {
    cardEl.addEventListener('dragstart', (e) => {
      this._draggedCard = {
        cardId: cardEl.dataset.cardId,
        fromColumnId: cardEl.dataset.columnId
      };
      cardEl.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', cardEl.dataset.cardId);
    });

    cardEl.addEventListener('dragend', () => {
      cardEl.classList.remove('dragging');
      this._draggedCard = null;
      document.querySelectorAll('.drop-placeholder').forEach(p => p.remove());
      document.querySelectorAll('.drag-over-card').forEach(c => c.classList.remove('drag-over-card'));
    });
  },

  _hashToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 65%, 55%)`;
  },

  _getTagsForDisplay(tagIds) {
    if (!this._settings || !this._settings.tags) return [];
    return tagIds.map(id => this._settings.tags.find(t => t.id === id)).filter(Boolean);
  },

  _updateFilterDropdowns() {
    const assigneeSelect = document.getElementById('filter-assignee');
    if (!assigneeSelect) return;

    const performers = this._settings?.performers || [];
    const currentAssignee = assigneeSelect.value;
    assigneeSelect.innerHTML = '<option value="">Все исполнители</option>';
    for (const performer of performers) {
      const opt = document.createElement('option');
      opt.value = performer.name;
      opt.textContent = performer.name;
      if (performer.name === currentAssignee) opt.selected = true;
      assigneeSelect.appendChild(opt);
    }

    this._renderTagsDropdown();
    this._renderTagsChips();
  },

  _renderTagsDropdown() {
    const listEl = document.getElementById('filter-tags-list');
    const labelEl = document.getElementById('filter-tags-label');
    if (!listEl || !labelEl) return;

    listEl.innerHTML = '';
    const allTags = this._settings?.tags || [];

    if (allTags.length === 0) {
      listEl.innerHTML = '<div class="filter-tag-item" style="cursor:default;opacity:0.5">Нет тегов</div>';
      this._updateTagsLabel(labelEl);
      return;
    }

    for (const tag of allTags) {
      const item = document.createElement('div');
      item.className = 'filter-tag-item' + (this._filterState.tags.includes(tag.id) ? ' selected' : '');
      item.dataset.tagId = tag.id;
      item.innerHTML = `
        <span class="filter-tag-checkbox"></span>
        <span class="filter-tag-color" style="background:${tag.color}"></span>
        <span class="filter-tag-name">${tag.name}</span>
      `;
      item.addEventListener('click', () => this._toggleTagFilter(tag.id));
      listEl.appendChild(item);
    }

    this._updateTagsLabel(labelEl);
  },

  _updateTagsLabel(labelEl) {
    if (this._filterState.tags.length > 0) {
      labelEl.textContent = `${this._filterState.tags.length} выбрано`;
    } else {
      labelEl.textContent = 'Все теги';
    }
  },

  _renderTagsChips() {
    const chipsEl = document.getElementById('filter-tags-chips');
    if (!chipsEl) return;
    chipsEl.innerHTML = '';

    const allTags = this._settings?.tags || [];
    for (const tagId of this._filterState.tags) {
      const tag = allTags.find(t => t.id === tagId);
      if (!tag) continue;

      const chip = document.createElement('span');
      chip.className = 'filter-tag-chip';
      chip.style.background = tag.color + '22';
      chip.style.color = tag.color;
      chip.style.border = `1px solid ${tag.color}55`;
      chip.innerHTML = `
        <span class="filter-tag-name">${tag.name}</span>
        <span class="filter-tag-chip-remove" title="Удалить фильтр">&#10005;</span>
      `;
      chip.querySelector('.filter-tag-chip-remove').addEventListener('click', (e) => {
        e.stopPropagation();
        this._removeTagFilter(tagId);
      });
      chipsEl.appendChild(chip);
    }
  },

  _toggleTagFilter(tagId) {
    const tags = this._filterState.tags;
    const index = tags.indexOf(tagId);
    if (index >= 0) {
      tags.splice(index, 1);
    } else {
      tags.push(tagId);
    }
    this._applyFilters();
  },

  _removeTagFilter(tagId) {
    this._filterState.tags = this._filterState.tags.filter(t => t !== tagId);
    this._applyFilters();
  },

  _updateClearButton() {
    const btn = document.getElementById('filter-clear');
    if (!btn) return;
    const hasFilters = this._filterState.search || this._filterState.priority || this._filterState.assignee || this._filterState.tags.length > 0;
    btn.classList.toggle('visible', hasFilters);
  },

  _applyFilters() {
    this._filterState.search = document.getElementById('filter-search').value.trim();
    this._filterState.priority = document.getElementById('filter-priority').value;
    this._filterState.assignee = document.getElementById('filter-assignee').value;
    this._renderBoard();
    this._updateClearButton();
    this._renderTagsDropdown();
    this._renderTagsChips();
    this.save();
  },

  _clearFilters() {
    this._filterState = { search: '', priority: '', assignee: '', tags: [] };
    const searchInput = document.getElementById('filter-search');
    const prioritySelect = document.getElementById('filter-priority');
    const assigneeSelect = document.getElementById('filter-assignee');
    if (searchInput) searchInput.value = '';
    if (prioritySelect) prioritySelect.value = '';
    if (assigneeSelect) assigneeSelect.value = '';
    this._renderBoard();
    this._updateFilterDropdowns();
    this._updateClearButton();
    this.save();
  },

  _bindColumnDragDrop(colEl, cardsContainer, columnId) {
    cardsContainer.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';

      const afterElement = this._getDragAfterElement(cardsContainer, e.clientY);
      const placeholder = document.querySelector('.drop-placeholder') || this._createPlaceholder();
      if (afterElement == null) {
        cardsContainer.appendChild(placeholder);
      } else {
        cardsContainer.insertBefore(placeholder, afterElement);
      }
    });

    cardsContainer.addEventListener('dragleave', (e) => {
      if (!cardsContainer.contains(e.relatedTarget)) {
        cardsContainer.querySelectorAll('.drop-placeholder').forEach(p => p.remove());
      }
    });

    cardsContainer.addEventListener('drop', (e) => {
      e.preventDefault();
      if (!this._draggedCard) return;

      const { cardId, fromColumnId } = this._draggedCard;
      if (fromColumnId === columnId) {
        const afterElement = this._getDragAfterElement(cardsContainer, e.clientY);
        this._reorderCardInColumn(columnId, cardId, afterElement);
      } else {
        this._moveCard(fromColumnId, columnId, cardId);
      }

      document.querySelectorAll('.drop-placeholder').forEach(p => p.remove());
      this._renderBoard();
      this.save();
      this._draggedCard = null;
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

    const header = colEl.querySelector('.column-header');
    header.addEventListener('dragstart', (e) => {
      this._draggedColumn = columnId;
      colEl.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', 'column:' + columnId);
    });

    header.addEventListener('dragend', () => {
      this._draggedColumn = null;
      colEl.classList.remove('dragging');
      document.querySelectorAll('.drag-over-column').forEach(c => c.classList.remove('drag-over-column'));
    });
  },

  _getDragAfterElement(container, y) {
    return getCardDragAfterElement(container, y);
  },

  _createPlaceholder() {
    const ph = document.createElement('div');
    ph.className = 'drop-placeholder';
    return ph;
  },

  _moveCard(fromColumnId, toColumnId, cardId) {
    const fromCol = this._columns.find(c => c.id === fromColumnId);
    const toCol = this._columns.find(c => c.id === toColumnId);
    if (!fromCol || !toCol) return;

    const cardIndex = fromCol.cards.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return;

    const [card] = fromCol.cards.splice(cardIndex, 1);
    card.order = toCol.cards.length;
    toCol.cards.push(card);
  },

  _reorderCardInColumn(columnId, cardId, afterElement) {
    const col = this._columns.find(c => c.id === columnId);
    if (!col) return;

    const cardIndex = col.cards.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return;

    const [card] = col.cards.splice(cardIndex, 1);

    let newIndex = col.cards.length;
    if (afterElement != null) {
      const afterId = afterElement.dataset.cardId;
      const afterIndex = col.cards.findIndex(c => c.id === afterId);
      if (afterIndex !== -1) {
        newIndex = afterIndex;
      }
    }

    col.cards.splice(newIndex, 0, card);
  },

  _bindColumnReorder(board) {
    board.addEventListener('dragover', (e) => {
      if (!this._draggedColumn) return;
      e.preventDefault();

      const columns = [...board.querySelectorAll('.kanban-column')];
      const afterElement = columns.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = e.clientX - box.left - box.width / 2;
        if (offset < 0 && offset > closest.offset) {
          return { offset: offset, element: child };
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
      if (!this._draggedColumn) return;
      e.preventDefault();

      const columnEls = [...board.querySelectorAll('.kanban-column')];
      const columnIds = columnEls.map(el => el.dataset.columnId);
      const newColumns = [];
      for (const id of columnIds) {
        const orig = this._columns.find(c => c.id === id);
        if (orig) newColumns.push(orig);
      }
      this._columns = newColumns;

      this.save();
      this._draggedColumn = null;
    });
  },

  _openNewCardModal(columnId) {
    this._editingCard = { title: '', description: '', priority: '', columnId: columnId, assignee: '', tags: [] };
    this._editingColumnId = columnId;
    document.getElementById('modal-title').textContent = 'Новая задача';
    document.getElementById('card-title-input').value = '';
    document.getElementById('card-desc-input').value = '';
    this._populateAssigneeSelect('');
    document.getElementById('card-priority-select').value = '';
    document.getElementById('card-delete-btn').style.display = 'none';
    this._populateTagSelector([]);
    this._closeTagsDropdown();
    document.getElementById('edit-card-modal').style.display = 'flex';
    setTimeout(() => document.getElementById('card-title-input').focus(), 50);
  },

  _openEditCardModal(card, columnId) {
    if (card._isTemporary) return;
    this._editingCard = { ...card, tags: card.tags ? [...card.tags] : [] };
    this._editingColumnId = columnId;
    document.getElementById('modal-title').textContent = 'Редактировать задачу';
    document.getElementById('card-title-input').value = card.title || '';
    document.getElementById('card-desc-input').value = card.description || '';
    this._populateAssigneeSelect(card.assignee || '');
    document.getElementById('card-priority-select').value = card.priority || '';
    document.getElementById('card-delete-btn').style.display = 'inline-block';
    this._populateTagSelector(card.tags || []);
    this._closeTagsDropdown();
    document.getElementById('edit-card-modal').style.display = 'flex';
  },

  _closeModal() {
    document.getElementById('edit-card-modal').style.display = 'none';
    this._editingCard = null;
    this._editingColumnId = null;
  },

  _populateTagSelector(selectedTagIds) {
    const container = document.getElementById('card-tags-selector');
    if (!container) return;
    container.innerHTML = '';
    const tags = this._settings?.tags || [];
    if (tags.length === 0) {
      container.innerHTML = '<div class="card-tags-empty">Нет тегов</div>';
      this._updateTagsDisplay();
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
      cb.addEventListener('change', () => {
        this._updateTagsDisplay();
      });
      container.appendChild(label);
    }
    this._updateTagsDisplay();
  },

  _updateTagsDisplay() {
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
    const tags = this._settings?.tags || [];
    for (const cb of checkedBoxes) {
      const tag = tags.find(t => t.id === cb.value);
      if (!tag) continue;
      const badge = document.createElement('span');
      badge.className = 'card-selected-tag';
      badge.style.background = tag.color;
      badge.innerHTML = `<span class="card-selected-tag-name">${tag.name}</span><span class="card-remove-tag" data-tag-id="${tag.id}" title="Удалить тег">&times;</span>`;
      const removeBtn = badge.querySelector('.card-remove-tag');
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        cb.checked = false;
        this._updateTagsDisplay();
      });
      display.appendChild(badge);
      const dropdownBadge = badge.cloneNode(true);
      dropdownBadge.querySelector('.card-remove-tag').addEventListener('click', (e) => {
        e.stopPropagation();
        cb.checked = false;
        this._updateTagsDisplay();
      });
      selectedContainer.appendChild(dropdownBadge);
    }
  },

  _toggleTagsDropdown() {
    const wrapper = document.getElementById('card-tags-dropdown-wrapper');
    const dropdown = document.getElementById('card-tags-dropdown');
    if (!wrapper || !dropdown) return;
    const isActive = wrapper.classList.contains('active');
    wrapper.classList.toggle('active', !isActive);
    dropdown.classList.toggle('active', !isActive);
  },

  _closeTagsDropdown() {
    const wrapper = document.getElementById('card-tags-dropdown-wrapper');
    const dropdown = document.getElementById('card-tags-dropdown');
    if (wrapper) wrapper.classList.remove('active');
    if (dropdown) dropdown.classList.remove('active');
    const selected = document.getElementById('card-tags-selected');
    if (selected) selected.innerHTML = '';
  },

  _populateAssigneeSelect(selectedValue) {
    const select = document.getElementById('card-assignee-select');
    if (!select) return;
    select.innerHTML = '<option value="">Не назначен</option>';
    const performers = this._settings?.performers || [];
    for (const performer of performers) {
      const opt = document.createElement('option');
      opt.value = performer.name;
      opt.textContent = performer.name;
      if (performer.name === selectedValue) opt.selected = true;
      select.appendChild(opt);
    }
  },

  _saveCard() {
    const title = document.getElementById('card-title-input').value.trim();
    if (!title) return;

    const description = document.getElementById('card-desc-input').value.trim();
    const priority = document.getElementById('card-priority-select').value;
    const assignee = document.getElementById('card-assignee-select').value;

    const selectedTags = Array.from(document.querySelectorAll('.card-tag-option input[type="checkbox"]:checked')).map(cb => cb.value);

    if (this._editingCard && this._editingCard.id) {
      const col = this._columns.find(c => c.id === this._editingColumnId);
      if (col) {
        const card = col.cards.find(c => c.id === this._editingCard.id);
        if (card) {
          card.title = title;
          card.description = description;
          card.priority = priority;
          card.assignee = assignee;
          card.tags = selectedTags;
          card.updatedAt = Date.now();
        }
      }
    } else {
      const col = this._columns.find(c => c.id === this._editingColumnId);
      if (col) {
        col.cards.push({
          id: Storage.generateId(),
          title: title,
          description: description,
          priority: priority,
          assignee: assignee,
          tags: selectedTags,
          order: col.cards.length,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      }
    }

    this._closeModal();
    this._renderBoard();
    this._updateFilterDropdowns();
    this.save();
  },

  _deleteCard() {
    if (!this._editingCard || this._editingCard._isTemporary) return;

    if (!confirm('Удалить задачу "' + this._editingCard.title + '"?')) return;

    const col = this._columns.find(c => c.id === this._editingColumnId);
    if (col) {
      col.cards = col.cards.filter(c => c.id !== this._editingCard.id);
    }

    this._closeModal();
    this._renderBoard();
    this.save();
  },

  _addColumn() {
    const newCol = {
      id: Storage.generateId(),
      title: 'Новая колонка',
      color: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0'),
      order: this._columns.length,
      cards: []
    };
    this._columns.push(newCol);
    this._renderBoard();
    this.save();

    const board = document.getElementById('kanban-board');
    const lastCol = board.querySelector('.kanban-column:last-child');
    if (lastCol) {
      const input = lastCol.querySelector('.column-title input');
      if (input) input.focus();
    }
  },

  _editColumn(columnId) {
    const col = this._columns.find(c => c.id === columnId);
    if (!col) return;

    const colEl = document.querySelector('.kanban-column[data-column-id="' + columnId + '"]');
    if (!colEl) return;

    const titleContainer = colEl.querySelector('.column-title');
    const currentTitle = col.title;
    const currentColor = col.color;

    titleContainer.innerHTML = '';

    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentTitle;

    const colorPicker = document.createElement('input');
    colorPicker.type = 'color';
    colorPicker.value = currentColor;
    colorPicker.className = 'column-color-picker';

    const saveBtn = document.createElement('button');
    saveBtn.className = 'column-action-btn';
    saveBtn.innerHTML = '&#10003;';
    saveBtn.addEventListener('click', () => {
      col.title = input.value.trim() || 'Без названия';
      col.color = colorPicker.value;
      this._renderBoard();
      this.save();
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'column-action-btn delete';
    cancelBtn.innerHTML = '&times;';
    cancelBtn.addEventListener('click', () => {
      this._renderBoard();
    });

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
  },

  _deleteColumn(columnId) {
    const col = this._columns.find(c => c.id === columnId);
    if (!col) return;
    if (this._columns.length <= 1) return;

    if (!confirm('Удалить колонку "' + col.title + '" и все её задачи?')) return;

    this._columns = this._columns.filter(c => c.id !== columnId);
    this._renderBoard();
    this.save();
  },

  _bindEvents() {
    const board = document.getElementById('kanban-board');
    if (board) {
      this._bindColumnReorder(board);
    }

    document.getElementById('card-save').addEventListener('click', () => this._saveCard());
    document.getElementById('card-cancel').addEventListener('click', () => this._closeModal());
    document.getElementById('card-delete-btn').addEventListener('click', () => this._deleteCard());

    document.getElementById('card-title-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._saveCard();
      if (e.key === 'Escape') this._closeModal();
    });

    document.getElementById('edit-card-modal').addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-overlay')) {
        this._closeModal();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this._closeModal();
      }
    });

    const filterSearch = document.getElementById('filter-search');
    const filterPriority = document.getElementById('filter-priority');
    const filterAssignee = document.getElementById('filter-assignee');
    const filterClear = document.getElementById('filter-clear');

    if (filterSearch) {
      filterSearch.addEventListener('input', () => this._applyFilters());
    }
    if (filterPriority) {
      filterPriority.addEventListener('change', () => this._applyFilters());
    }
    if (filterAssignee) {
      filterAssignee.addEventListener('change', () => this._applyFilters());
    }
    if (filterClear) {
      filterClear.addEventListener('click', () => this._clearFilters());
    }

    // Tags dropdown toggle
    const tagsLabel = document.getElementById('filter-tags-label');
    if (tagsLabel) {
      tagsLabel.addEventListener('click', () => {
        const dropdown = document.getElementById('filter-tags-dropdown');
        if (!dropdown) return;
        const isVisible = dropdown.style.display === 'block';
        dropdown.style.display = isVisible ? 'none' : 'block';
        tagsLabel.classList.toggle('active', !isVisible);
        if (!isVisible) {
          this._renderTagsDropdown();
        }
      });
    }

    // Close tags dropdown on outside click
    document.addEventListener('click', (e) => {
      const dropdown = document.getElementById('filter-tags-dropdown');
      const label = document.getElementById('filter-tags-label');
      if (dropdown && label && !dropdown.contains(e.target) && !label.contains(e.target)) {
        dropdown.style.display = 'none';
        label.classList.remove('active');
      }
    });

    // Card tags dropdown toggle
    const tagsDisplay = document.getElementById('card-tags-display');
    if (tagsDisplay) {
      tagsDisplay.addEventListener('click', (e) => {
        e.stopPropagation();
        this._toggleTagsDropdown();
      });
    }

    // Card tags clear button
    const tagsClearBtn = document.getElementById('tags-dropdown-clear');
    if (tagsClearBtn) {
      tagsClearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const checkboxes = document.querySelectorAll('.card-tag-option input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = false);
        this._updateTagsDisplay();
      });
    }

    // Close card tags dropdown on outside click
    document.addEventListener('click', (e) => {
      const wrapper = document.getElementById('card-tags-dropdown-wrapper');
      if (wrapper && wrapper.classList.contains('active') && !wrapper.contains(e.target)) {
        this._closeTagsDropdown();
      }
    });
  },

  async _openManagePerformersModal() {
    const modal = document.getElementById('manage-performers-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    this._renderPerformersList();
  },

  _renderPerformersList() {
    const list = document.getElementById('performers-list');
    if (!list) return;
    list.innerHTML = '';
    const performers = this._settings?.performers || [];
    for (const performer of performers) {
      const item = document.createElement('div');
      item.className = 'performer-item';
      item.dataset.id = performer.id;
      item.innerHTML = `
        <span class="performer-color-dot" style="background:${performer.color}"></span>
        <span class="performer-name">${performer.name}</span>
        <button class="performer-edit" title="Редактировать">&#9998;</button>
        <button class="performer-delete" title="Удалить">&#10005;</button>
      `;
      const editBtn = item.querySelector('.performer-edit');
      editBtn.addEventListener('click', () => this._editPerformer(performer));
      const deleteBtn = item.querySelector('.performer-delete');
      deleteBtn.addEventListener('click', () => this._deletePerformer(performer.id));
      list.appendChild(item);
    }
  },

  async _editPerformer(performer) {
    const newName = prompt('Имя исполнителя:', performer.name);
    if (!newName || newName.trim() === '') return;
    const newColor = prompt('Цвет (hex):', performer.color);
    if (!newColor) return;
    const performers = this._settings?.performers || [];
    const p = performers.find(x => x.id === performer.id);
    if (p) {
      p.name = newName.trim();
      p.color = newColor.trim();
    }
    await this._savePerformers();
  },

  async _deletePerformer(id) {
    const performers = this._settings?.performers || [];
    const performer = performers.find(x => x.id === id);
    if (!performer) return;
    const allCards = this._columns.flatMap(col => col.cards || []);
    const usedByCards = allCards.filter(c => c.assignee === performer.name);
    if (usedByCards.length > 0) {
      if (!confirm(`Исполнитель "${performer.name}" используется в ${usedByCards.length} задачах.\nВсе ссылки будут удалены. Продолжить?`)) return;
    }
    this._settings.performers = performers.filter(x => x.id !== id);
    for (const card of usedByCards) {
      card.assignee = '';
    }
    await this._savePerformers();
  },

  async _addPerformer() {
    const nameInput = document.getElementById('performer-name-input');
    const colorInput = document.getElementById('performer-color-input');
    if (!nameInput || !colorInput) return;
    const name = nameInput.value.trim();
    if (!name) return;
    const color = colorInput.value;
    if (!this._settings.performers) this._settings.performers = [];
    this._settings.performers.push({
      id: Storage.generateId(),
      name: name,
      color: color
    });
    nameInput.value = '';
    await this._savePerformers();
  },

  async _savePerformers() {
    await Storage.set('settings', this._settings);
    this._renderPerformersList();
    this._updateFilterDropdowns();
    this._renderBoard();
  },

  async _openManageTagsModal() {
    const modal = document.getElementById('manage-tags-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    this._renderTagsList();
  },

  _renderTagsList() {
    const list = document.getElementById('manage-tags-list');
    if (!list) return;
    list.innerHTML = '';
    const tags = this._settings?.tags || [];
    for (const tag of tags) {
      const item = document.createElement('div');
      item.className = 'manage-tag-item';
      item.dataset.id = tag.id;
      item.dataset.editing = 'false';
      item.innerHTML = `
        <span class="tag-color-dot" style="background:${tag.color}"></span>
        <span class="tag-name" title="Нажмите для редактирования">${tag.name}</span>
        <input type="color" class="tag-color-picker" value="${tag.color}" title="Цвет">
        <button class="tag-edit" title="Редактировать">&#9998;</button>
        <button class="tag-delete" title="Удалить">&#10005;</button>
      `;
      const colorPicker = item.querySelector('.tag-color-picker');
      colorPicker.addEventListener('input', (e) => {
        e.stopPropagation();
        const dot = item.querySelector('.tag-color-dot');
        dot.style.background = e.target.value;
      });
      colorPicker.addEventListener('change', (e) => {
        e.stopPropagation();
        tag.color = e.target.value;
        this._saveTags();
      });
      const deleteBtn = item.querySelector('.tag-delete');
      deleteBtn.addEventListener('click', () => this._deleteTag(tag.id));
      const editBtn = item.querySelector('.tag-edit');
      const nameSpan = item.querySelector('.tag-name');
      nameSpan.addEventListener('click', () => this._enterEditMode(item, tag));
      editBtn.addEventListener('click', () => this._enterEditMode(item, tag));
      list.appendChild(item);
    }
  },

  _enterEditMode(item, tag) {
    item.dataset.editing = 'true';
    const nameSpan = item.querySelector('.tag-name');
    const colorPicker = item.querySelector('.tag-color-picker');
    nameSpan.style.display = 'none';
    colorPicker.style.display = 'none';
    let nameInput = item.querySelector('.tag-name-input');
    if (!nameInput) {
      nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.className = 'tag-name-input';
      nameInput.maxLength = 22;
      nameInput.value = tag.name;
      item.insertBefore(nameInput, colorPicker);
    }
    nameInput.style.display = 'block';
    nameInput.value = tag.name;
    nameInput.focus();
    nameInput.select();
    const saveBtn = document.createElement('button');
    saveBtn.className = 'tag-save';
    saveBtn.title = 'Сохранить';
    saveBtn.innerHTML = '&#10003;';
    saveBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._saveEdit(item, tag);
    });
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'tag-cancel';
    cancelBtn.title = 'Отмена';
    cancelBtn.innerHTML = '&#10007;';
    cancelBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._cancelEdit(item, tag);
    });
    let deleteBtn = item.querySelector('.tag-delete');
    item.insertBefore(saveBtn, cancelBtn);
    item.insertBefore(cancelBtn, deleteBtn);
    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this._saveEdit(item, tag);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this._cancelEdit(item, tag);
      }
    });
    nameInput.addEventListener('blur', () => {
      if (item.dataset.editing === 'true') {
        const name = nameInput.value.trim();
        if (name && name.length <= 22) {
          tag.name = name;
          tag.color = item.querySelector('.tag-color-picker').value;
          this._saveTags();
        } else {
          this._cancelEdit(item, tag);
        }
      }
    });
    item.appendChild(saveBtn);
    item.appendChild(cancelBtn);
  },

  _saveEdit(item, tag) {
    const nameInput = item.querySelector('.tag-name-input');
    const name = nameInput.value.trim();
    if (!name || name.length > 22) return;
    tag.name = name;
    tag.color = item.querySelector('.tag-color-picker').value;
    this._saveTags();
  },

  _cancelEdit(item, tag) {
    item.dataset.editing = 'false';
    const nameSpan = item.querySelector('.tag-name');
    const colorPicker = item.querySelector('.tag-color-picker');
    const saveBtn = item.querySelector('.tag-save');
    const cancelBtn = item.querySelector('.tag-cancel');
    const nameInput = item.querySelector('.tag-name-input');
    if (saveBtn) saveBtn.remove();
    if (cancelBtn) cancelBtn.remove();
    nameSpan.style.display = 'inline';
    colorPicker.style.display = 'inline-block';
    if (nameInput) nameInput.style.display = 'none';
    nameSpan.textContent = tag.name;
  },

  async _deleteTag(id) {
    const tags = this._settings?.tags || [];
    const tag = tags.find(x => x.id === id);
    if (!tag) return;
    const allCards = this._columns.flatMap(col => col.cards || []);
    const usedByCards = allCards.filter(c => c.tags && c.tags.includes(id));
    if (usedByCards.length > 0) {
      if (!confirm(`Тег "${tag.name}" используется в ${usedByCards.length} задачах.\nВсе ссылки будут удалены. Продолжить?`)) return;
    }
    this._settings.tags = tags.filter(x => x.id !== id);
    for (const card of usedByCards) {
      card.tags = (card.tags || []).filter(t => t !== id);
    }
    await this._saveTags();
  },

  async _addTag() {
    const nameInput = document.getElementById('tag-name-input');
    const colorInput = document.getElementById('tag-color-input');
    if (!nameInput || !colorInput) return;
    const name = nameInput.value.trim();
    if (!name) return;
    const color = colorInput.value;
    if (!this._settings.tags) this._settings.tags = [];
    this._settings.tags.push({
      id: Storage.generateId(),
      name: name,
      color: color
    });
    nameInput.value = '';
    await this._saveTags();
  },

  async _saveTags() {
    await Storage.set('settings', this._settings);
    this._renderTagsList();
    this._updateFilterDropdowns();
    this._renderBoard();
  }
};
