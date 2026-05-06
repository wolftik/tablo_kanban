'use strict';

/**
 * In-memory data store for the kanban board.
 * Manages columns, cards, tags, performers, and authors.
 * @namespace KanbanStore
 */
const KanbanStore = (() => {
  let _columns = [];
  let _tags = [];
  let _performers = [];
  let _authors = [];
  let _kanbanFilter = null;
  let _tagsIndex = null;

  function _updateTagsIndex() {
    _tagsIndex = new Map(_tags.map(t => [t.id, t]));
  }

  function tagById(id) {
    return _tagsIndex ? _tagsIndex.get(id) : null;
  }

  function getState() {
    return { columns: _columns, tags: _tags, performers: _performers, authors: _authors, kanbanFilter: _kanbanFilter };
  }

  function loadData(saved) {
    _columns = saved.columns ? saved.columns : _createDefaultColumns();
    _columns.forEach(col => col.cards = col.cards || []);
    _tags = saved.tags || KanbanConstants.DEFAULT_TAGS.map(t => ({ ...t, id: generateId() }));
    _performers = saved.performers || KanbanConstants.DEFAULT_PERFORMERS.map(p => ({ ...p, id: generateId() }));
    _authors = saved.authors || [];
    _kanbanFilter = saved.kanbanFilter || { search: '', priority: '', assignee: '', author: '', tags: [] };
    _updateTagsIndex();
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

  function getColumns() {
    return [..._columns];
  }

  function getTags() {
    return [..._tags];
  }

  function getPerformers() {
    return [..._performers];
  }

  function getAuthors() {
    return [..._authors];
  }

  function getFilter() {
    return _kanbanFilter;
  }

  function setFilter(f) {
    _kanbanFilter = f;
  }

  function getCardsForColumn(columnId) {
    const col = _columns.find(c => c.id === columnId);
    return col?.cards || [];
  }

  function addCard(columnId, cardData) {
    const col = _columns.find(c => c.id === columnId);
    if (!col) return null;
    const card = {
      id: generateId(),
      ...cardData,
      order: col.cards.length,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    col.cards.push(card);
    return card;
  }

  function updateCard(columnId, cardId, updates) {
    const col = _columns.find(c => c.id === columnId);
    if (!col) return false;
    const card = col.cards.find(c => c.id === cardId);
    if (!card) return false;
    Object.assign(card, updates, { updatedAt: Date.now() });
    return true;
  }

  function deleteCard(columnId, cardId) {
    const col = _columns.find(c => c.id === columnId);
    if (!col) return false;
    col.cards = col.cards.filter(c => c.id !== cardId);
    return true;
  }

  function moveCard(fromColumnId, toColumnId, cardId, insertIndex) {
    const fromCol = _columns.find(c => c.id === fromColumnId);
    const toCol = _columns.find(c => c.id === toColumnId);
    if (!fromCol || !toCol) return;

    const cardIndex = fromCol.cards.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return;

    const [card] = fromCol.cards.splice(cardIndex, 1);

    if (insertIndex === undefined || insertIndex === null) {
      insertIndex = toCol.cards.length;
    }
    toCol.cards.splice(insertIndex, 0, card);
    toCol.cards.forEach((c, i) => { c.order = i; });
  }

  function reorderCardInColumn(columnId, cardId, insertIndex) {
    const col = _columns.find(c => c.id === columnId);
    if (!col) return;

    const cardIndex = col.cards.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return;
    const [card] = col.cards.splice(cardIndex, 1);

    if (insertIndex === undefined || insertIndex === null) {
      insertIndex = col.cards.length;
    }
    const adjustedIndex = cardIndex < insertIndex ? insertIndex - 1 : insertIndex;
    col.cards.splice(adjustedIndex, 0, card);
    col.cards.forEach((c, i) => { c.order = i; });
  }

  function isFirstColumn(columnId) {
    return _columns.length > 0 && _columns[0].id === columnId;
  }

  function isLastColumn(columnId) {
    return _columns.length > 0 && _columns[_columns.length - 1].id === columnId;
  }

  function addColumn(title, color) {
    const newCol = {
      id: generateId(),
      title: title,
      color: color,
      order: _columns.length,
      cards: []
    };
    _columns.push(newCol);
    return newCol;
  }

  function deleteColumn(columnId) {
    if (_columns.length <= 1) return false;
    if (isFirstColumn(columnId)) return false;
    const idx = _columns.findIndex(c => c.id === columnId);
    if (idx === -1) return false;
    _columns.splice(idx, 1);
    return true;
  }

  function clearColumnCards(columnId) {
    const col = _columns.find(c => c.id === columnId);
    if (!col) return false;
    col.cards = [];
    return true;
  }

  function reorderColumns(orderedIds) {
    const newColumns = [];
    for (const id of orderedIds) {
      const orig = _columns.find(c => c.id === id);
      if (orig) newColumns.push(orig);
    }
    const firstCol = newColumns.find(c => isFirstColumn(c.id));
    if (firstCol && newColumns.indexOf(firstCol) !== 0) {
      newColumns.splice(newColumns.indexOf(firstCol), 1);
      newColumns.unshift(firstCol);
    }
    _columns = newColumns;
  }

  function toSaveData() {
    _columns.forEach((col, i) => { col.order = i; });
    return {
      columns: _columns,
      kanbanFilter: _kanbanFilter,
      tags: _tags,
      performers: _performers,
      authors: _authors,
      _modified: Date.now()
    };
  }

  return {
    getState, loadData, getColumns, getTags, getPerformers, getAuthors,
    getFilter, setFilter, getCardsForColumn,
    addCard, updateCard, deleteCard, moveCard, reorderCardInColumn,
    addColumn, deleteColumn, clearColumnCards, reorderColumns,
    toSaveData, tagById, isFirstColumn, isLastColumn
  };
})();
