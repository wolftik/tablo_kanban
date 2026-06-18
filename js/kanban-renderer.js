'use strict';

const KanbanRenderer = (() => {
  let _dom = {};
  let _onEditCard = null;
  let _onAddCard = null;
  let _onAddColumn = null;
  let _onClearColumn = null;
  let _onDeleteColumn = null;
  let _onFilterTagToggle = null;
  let _onFilterTagRemove = null;
  let _onCardDragStart = null;
  let _onCardDragEnd = null;

  function init(doms, callbacks) {
    _dom = doms;
    _onEditCard = callbacks.onEditCard;
    _onAddCard = callbacks.onAddCard;
    _onAddColumn = callbacks.onAddColumn;
    _onClearColumn = callbacks.onClearColumn;
    _onDeleteColumn = callbacks.onDeleteColumn;
    _onFilterTagToggle = callbacks.onFilterTagToggle;
    _onFilterTagRemove = callbacks.onFilterTagRemove;
    _onCardDragStart = callbacks.onCardDragStart;
    _onCardDragEnd = callbacks.onCardDragEnd;
  }

  function renderBoard(columns) {
    const board = _dom.board;
    if (!board) return;

    const sorted = [...columns].sort((a, b) => (a.order || 0) - (b.order || 0));

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
        const addBtn = board.querySelector(':scope > .add-column-btn');
        const refNode = insertBeforeEl || addBtn || null;
        if (refNode) {
          board.insertBefore(colEl, refNode);
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
      addBtn.addEventListener('click', () => { if (_onAddColumn) _onAddColumn(); });
      board.appendChild(addBtn);
    }

  }

  function _updateColumnElement(colEl, col) {
    const isFirst = KanbanStore.isFirstColumn(col.id);
    const header = colEl.querySelector('.column-header');
    if (header) header.draggable = !isFirst && !KanbanStore.isLastColumn(col.id);

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
    if (count && count.textContent !== String((col.cards || []).length)) {
      count.textContent = (col.cards || []).length;
    }

    const cardsContainer = colEl.querySelector('.column-cards');
    if (cardsContainer) {
      _syncCardsContainer(cardsContainer, col);
    }
  }

  function _syncCardsContainer(container, col) {
    const filteredCards = KanbanFilter.filterCards(KanbanStore.getCardsForColumn(col.id));
    const existingCards = container.querySelectorAll(':scope > .kanban-card');
    const existingMap = new Map();
    existingCards.forEach(el => existingMap.set(el.dataset.cardId, el));

    const removeCardIds = new Set(existingMap.keys());
    let insertBeforeCard = null;
    const performers = KanbanStore.getPerformers();
    const tagById = KanbanStore.tagById;

    for (let i = filteredCards.length - 1; i >= 0; i--) {
      const card = filteredCards[i];
      removeCardIds.delete(card.id);

      const existing = existingMap.get(card.id);
      if (existing) {
        _updateCardElement(existing, card, col.id);
        if (existing.nextElementSibling !== insertBeforeCard) {
          if (insertBeforeCard && container.contains(insertBeforeCard)) {
            container.insertBefore(existing, insertBeforeCard);
          } else {
            container.appendChild(existing);
          }
        }
      } else {
        const cardEl = KanbanCard.create(card, col.id, performers, KanbanStore.getTags(), tagById);
        if (_onCardDragStart) _bindCardDrag(cardEl);
        cardEl.addEventListener('click', () => { if (_onEditCard) _onEditCard(card, col.id); });
        if (insertBeforeCard && container.contains(insertBeforeCard)) {
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
    addCardBtn.onclick = () => { if (_onAddCard) _onAddCard(col.id); };
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

    const agingEl = cardEl.querySelector('.card-aging-badge');
    const columns = KanbanStore.getColumns();
    const isFirst = columns.length > 0 && columns[0].id === columnId;
    const isClosed = !!card.closedAt;
    if (card.createdAt && (isFirst || isClosed)) {
      const age = isClosed ? (card.closedAt - card.createdAt) : (Date.now() - card.createdAt);
      if (age > KanbanConstants.AGING_FIRE_MS) {
        if (!agingEl || !agingEl.classList.contains('card-fire')) {
          if (agingEl) agingEl.remove();
          const fire = document.createElement('span');
          fire.className = 'card-aging-badge card-fire';
          fire.textContent = '\uD83D\uDD25';
          fire.title = I18n.t('card.fire.tooltip');
          cardEl.insertBefore(fire, cardEl.firstChild);
        }
      } else if (age > KanbanConstants.AGING_SNAIL_MS) {
        if (!agingEl || !agingEl.classList.contains('card-snail')) {
          if (agingEl) agingEl.remove();
          const snail = document.createElement('span');
          snail.className = 'card-aging-badge card-snail';
          snail.textContent = '\uD83D\uDC0C';
          snail.title = I18n.t('card.old.tooltip');
          cardEl.insertBefore(snail, cardEl.firstChild);
        }
      } else if (agingEl) {
        agingEl.remove();
      }
    } else if (agingEl) {
      agingEl.remove();
    }

    const titleEl = cardEl.querySelector('.card-title');
    if (titleEl && titleEl.textContent !== card.title) {
      titleEl.textContent = card.title;
    }

    const descEl = cardEl.querySelector('.card-description');
    if (card.description) {
      const html = _renderMarkdown(card.description);
      if (!descEl) {
        const d = document.createElement('div');
        d.className = 'card-description';
        d.innerHTML = html;
        cardEl.insertBefore(d, cardEl.querySelector('.card-meta'));
      } else if (descEl.innerHTML !== html) {
        descEl.innerHTML = html;
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
        const avatar = document.createElement('span');
        avatar.className = 'assignee-avatar';
        ae.appendChild(avatar);
        cardEl.appendChild(ae);
      }
      const target = cardEl.querySelector('.card-assignee');
      const avatar = target ? target.querySelector('.assignee-avatar') : null;
      if (avatar) {
        const performers = KanbanStore.getPerformers();
        const performer = performers.find(p => p.name === card.assignee);
        const bg = performer ? performer.color : KanbanCard.hashToColor(card.assignee);
        if (avatar.style.background !== bg) avatar.style.background = bg;
        if (avatar.textContent !== card.assignee.charAt(0).toUpperCase()) avatar.textContent = card.assignee.charAt(0).toUpperCase();
        if (avatar.title !== card.assignee) avatar.title = card.assignee;
      }
    } else if (assigneeEl) {
      assigneeEl.remove();
    }

    const tagsContainer = cardEl.querySelector('.card-tags');
    if (card.tags && card.tags.length > 0) {
      const displayTags = KanbanCard.getTagsForDisplay(card.tags, KanbanStore.tagById, KanbanStore.getTags());
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

  function _bindCardDrag(cardEl) {
    cardEl.addEventListener('dragstart', (e) => {
      if (_onCardDragStart) _onCardDragStart(cardEl.dataset.cardId, cardEl.dataset.columnId);
      cardEl.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', cardEl.dataset.cardId);
      e.dataTransfer.setDragImage(cardEl, e.offsetX, e.offsetY);
    });

    cardEl.addEventListener('dragend', () => {
      cardEl.classList.remove('dragging');
      if (_onCardDragEnd) _onCardDragEnd();
      document.querySelectorAll('.drop-placeholder').forEach(p => p.remove());
    });
  }

  function _createColumnElement(col) {
    const colEl = document.createElement('div');
    colEl.className = 'kanban-column';
    colEl.dataset.columnId = col.id;

    const header = document.createElement('div');
    header.className = 'column-header';
    header.draggable = !KanbanStore.isFirstColumn(col.id) && !KanbanStore.isLastColumn(col.id);

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

    const isFirstCol = KanbanStore.isFirstColumn(col.id);
    const actions = document.createElement('div');
    actions.className = 'column-actions';

    const clearBtn = document.createElement('button');
    clearBtn.className = 'column-action-btn clear';
    clearBtn.innerHTML = '&#9003;';
    clearBtn.title = I18n.t('column.clear.cards');
    clearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (_onClearColumn) _onClearColumn(col.id);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'column-action-btn delete';
    deleteBtn.innerHTML = '&times;';
    deleteBtn.title = I18n.t('column.delete');
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (_onDeleteColumn) _onDeleteColumn(col.id);
    });
    if (isFirstCol || KanbanStore.isLastColumn(col.id)) deleteBtn.style.display = 'none';

    actions.appendChild(clearBtn);
    actions.appendChild(deleteBtn);

    header.appendChild(titleContainer);
    header.appendChild(count);
    header.appendChild(actions);

    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'column-cards';
    cardsContainer.dataset.columnId = col.id;

    KanbanDnD.bindColumnDragDrop(colEl, cardsContainer, col.id);

    const cards = KanbanFilter.filterCards(KanbanStore.getCardsForColumn(col.id));
    const fragment = document.createDocumentFragment();
    const performers = KanbanStore.getPerformers();
    const tagById = KanbanStore.tagById;
    for (const card of cards) {
      const cardEl = KanbanCard.create(card, col.id, performers, KanbanStore.getTags(), tagById);
      if (_onCardDragStart) _bindCardDrag(cardEl);
      cardEl.addEventListener('click', () => { if (_onEditCard) _onEditCard(card, col.id); });
      fragment.appendChild(cardEl);
    }
    cardsContainer.appendChild(fragment);

    const addCardBtn = document.createElement('button');
    addCardBtn.className = 'column-add-card';
    addCardBtn.textContent = I18n.t('column.add.card');
    addCardBtn.addEventListener('click', () => { if (_onAddCard) _onAddCard(col.id); });

    colEl.appendChild(header);
    colEl.appendChild(cardsContainer);
    colEl.appendChild(addCardBtn);

    return colEl;
  }

  function updateColumnCounts() {
    if (!_dom.board) return;
    _dom.board.querySelectorAll('.kanban-column').forEach(colEl => {
      const colId = colEl.dataset.columnId;
      const cards = KanbanFilter.filterCards(KanbanStore.getCardsForColumn(colId));
      const countEl = colEl.querySelector('.column-count');
      if (countEl) countEl.textContent = cards.length;
    });
  }

  function renderFilterUI() {
    const assigneeSelect = _dom.filterAssignee;
    if (!assigneeSelect) return;

    const currentAssignee = assigneeSelect.value;
    assigneeSelect.innerHTML = '<option value="">' + I18n.t('filter.all.assignees') + '</option>';
    for (const performer of KanbanStore.getPerformers()) {
      const opt = document.createElement('option');
      opt.value = performer.name;
      opt.textContent = performer.name;
      if (performer.name === currentAssignee) opt.selected = true;
      assigneeSelect.appendChild(opt);
    }

    const authorSelect = _dom.filterAuthor;
    if (authorSelect) {
      const currentAuthor = authorSelect.value;
      authorSelect.innerHTML = '<option value="">' + I18n.t('filter.all.authors') + '</option>';
      for (const author of KanbanStore.getAuthors()) {
        const opt = document.createElement('option');
        opt.value = author.name;
        opt.textContent = author.name;
        if (author.name === currentAuthor) opt.selected = true;
        authorSelect.appendChild(opt);
      }
    }

    renderTagsDropdown();
    _renderTagsChips();
  }

  function renderTagsDropdown() {
    const listEl = _dom.filterTagsList;
    const labelEl = _dom.filterTagsLabel;
    if (!listEl || !labelEl) return;

    listEl.innerHTML = '';

    const tags = KanbanStore.getTags();
    if (tags.length === 0) {
      listEl.innerHTML = '<div class="filter-tag-item" style="cursor:default;opacity:0.5">' + I18n.t('column.no.tags') + '</div>';
      _updateFilterTagsLabel(labelEl);
      return;
    }

    const fragment = document.createDocumentFragment();
    const filterState = KanbanFilter.getState();

    for (const tag of tags) {
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
        if (_onFilterTagToggle) _onFilterTagToggle(tag.id);
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

    const filterState = KanbanFilter.getState();
    const tags = KanbanStore.getTags();

    for (const tagId of filterState.tags) {
      const tag = tags.find(t => t.id === tagId);
      if (!tag) continue;

      const chip = document.createElement('span');
      chip.className = 'filter-tag-chip';
      chip.style.background = tag.color + '22';
      chip.style.color = tag.color;
      chip.style.border = '1px solid ' + tag.color + '55';
      chip.innerHTML = `<span class="filter-tag-name">${escapeHtml(tag.name)}</span><span class="filter-tag-chip-remove" title="${I18n.t('tags.remove.title')}">&#10005;</span>`;
      chip.querySelector('.filter-tag-chip-remove').addEventListener('click', (e) => {
        e.stopPropagation();
        if (_onFilterTagRemove) _onFilterTagRemove(tagId);
      });
      chipsEl.appendChild(chip);
    }
  }

  function updateClearButton() {
    const btn = _dom.filterClear;
    if (!btn) return;
    btn.classList.toggle('visible', KanbanFilter.hasActiveFilters());
  }

  function _renderMarkdown(text) {
    if (!text) return '';
    let html = escapeHtml(text);
    html = html.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    html = html.replace(/\*(.+?)\*/g, '<i>$1</i>');
    const lines = html.split('\n');
    let result = '';
    let inUl = false;
    let inOl = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const ulMatch = line.match(/^-\s+(.*)/);
      const olMatch = line.match(/^\d+\.\s+(.*)/);
      if (ulMatch) {
        if (inOl) { result += '</ol>\n'; inOl = false; }
        if (!inUl) { result += '<ul>\n'; inUl = true; }
        result += '<li>' + ulMatch[1] + '</li>\n';
      } else if (olMatch) {
        if (inUl) { result += '</ul>\n'; inUl = false; }
        if (!inOl) { result += '<ol>\n'; inOl = true; }
        result += '<li>' + olMatch[1] + '</li>\n';
      } else {
        if (inUl) { result += '</ul>\n'; inUl = false; }
        if (inOl) { result += '</ol>\n'; inOl = false; }
        if (line.trim() === '') {
          result += '\n';
        } else {
          result += line + '\n';
        }
      }
    }
    if (inUl) result += '</ul>\n';
    if (inOl) result += '</ol>\n';
    result = result.replace(/\n{3,}/g, '\n\n').trim();
    result = result.replace(/\n/g, '<br>');
    return result;
  }

  function getDom() {
    return _dom;
  }

  return {
    init, renderBoard, updateColumnCounts, renderFilterUI, renderTagsDropdown,
    _renderTagsChips, updateClearButton, getDom
  };
})();
