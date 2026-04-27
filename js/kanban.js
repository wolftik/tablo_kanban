const KanbanBoard = {
  _columns: [],
  _editingCard: null,
  _editingColumnId: null,
  _draggedCard: null,
  _draggedColumn: null,

  async init() {
    this._columns = await Storage.get('kanban_columns') || Storage.getDefaultColumns();
    this._renderBoard();
    this._bindEvents();
  },

  async save() {
    this._columns.forEach((col, i) => { col.order = i; });
    await Storage.set('kanban_columns', this._columns);
  },

  _getCardsForColumn(columnId) {
    return this._columns
      .find(c => c.id === columnId)
      .cards
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  },

  _renderBoard() {
    const board = document.getElementById('kanban-board');
    if (!board) return;

    board.innerHTML = '';

    const sorted = [...this._columns].sort((a, b) => (a.order || 0) - (b.order || 0));

    for (const col of sorted) {
      board.appendChild(this._createColumnElement(col));
    }

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
    colEl.draggable = true;

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

    const cards = this._getCardsForColumn(col.id);
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
    this._editingCard = { title: '', description: '', priority: '', columnId: columnId };
    this._editingColumnId = columnId;
    document.getElementById('modal-title').textContent = 'Новая задача';
    document.getElementById('card-title-input').value = '';
    document.getElementById('card-desc-input').value = '';
    document.getElementById('card-priority-select').value = '';
    document.getElementById('card-delete-btn').style.display = 'none';
    document.getElementById('edit-card-modal').style.display = 'flex';
    setTimeout(() => document.getElementById('card-title-input').focus(), 50);
  },

  _openEditCardModal(card, columnId) {
    if (card._isTemporary) return;
    this._editingCard = { ...card };
    this._editingColumnId = columnId;
    document.getElementById('modal-title').textContent = 'Редактировать задачу';
    document.getElementById('card-title-input').value = card.title || '';
    document.getElementById('card-desc-input').value = card.description || '';
    document.getElementById('card-priority-select').value = card.priority || '';
    document.getElementById('card-delete-btn').style.display = 'inline-block';
    document.getElementById('edit-card-modal').style.display = 'flex';
  },

  _closeModal() {
    document.getElementById('edit-card-modal').style.display = 'none';
    this._editingCard = null;
    this._editingColumnId = null;
  },

  _saveCard() {
    const title = document.getElementById('card-title-input').value.trim();
    if (!title) return;

    const description = document.getElementById('card-desc-input').value.trim();
    const priority = document.getElementById('card-priority-select').value;

    if (this._editingCard && !this._editingCard._isTemporary) {
      const col = this._columns.find(c => c.id === this._editingColumnId);
      if (col) {
        const card = col.cards.find(c => c.id === this._editingCard.id);
        if (card) {
          card.title = title;
          card.description = description;
          card.priority = priority;
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
          order: col.cards.length,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      }
    }

    this._closeModal();
    this._renderBoard();
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
  }
};
