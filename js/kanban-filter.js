'use strict';

/**
 * Stateful filter for kanban cards (search, priority, assignee, author, tags).
 * @namespace KanbanFilter
 */
const KanbanFilter = (() => {
  let _state = { search: '', priority: '', assignee: '', author: '', tags: [] };
  let _onChange = null;

  function init(state, onChange) {
    _state = { ..._state, ...(state || {}) };
    _onChange = onChange;
  }

  function getState() {
    return { ..._state };
  }

  function applyFilters(search, priority, assignee, author) {
    _state.search = search.trim();
    _state.priority = priority;
    _state.assignee = assignee;
    _state.author = author || '';
    _notify();
  }

  function toggleTag(tagId) {
    const idx = _state.tags.indexOf(tagId);
    if (idx >= 0) {
      _state.tags.splice(idx, 1);
    } else {
      _state.tags.push(tagId);
    }
    _notify();
  }

  function removeTag(tagId) {
    _state.tags = _state.tags.filter(t => t !== tagId);
    _notify();
  }

  function clear() {
    _state = { search: '', priority: '', assignee: '', author: '', tags: [] };
    _notify();
  }

  function hasActiveFilters() {
    return !!( _state.search || _state.priority || _state.assignee || _state.author || _state.tags.length > 0);
  }

  function filterCards(cards) {
    const f = _state;
    const query = f.search;
    const queryWords = query ? (query.match(/[а-яёА-ЯЁa-zA-Z]+/g) || []) : [];
    const russianQueryWords = queryWords.filter(w => /[а-яё]/i.test(w));
    const stemmedQueryWords = russianQueryWords.map(w => RussianStemmer.stem(w));

    return cards.filter(card => {
      if (query) {
        const q = query.toLowerCase();
        const fields = [
          card.title,
          card.description || '',
          card.assignee || '',
          card.author || ''
        ];

        const exactMatch = fields.some(field => field.toLowerCase().includes(q));

        if (!exactMatch && russianQueryWords.length > 0) {
          const cardWords = fields.flatMap(field => field.match(/[а-яёА-ЯЁa-zA-Z]+/g) || []);
          const russianCardWords = cardWords.filter(w => /[а-яё]/i.test(w));
          const stemmedCardWords = russianCardWords.map(w => RussianStemmer.stem(w));
          const stemMatch = stemmedQueryWords.some(sqw => stemmedCardWords.includes(sqw));
          if (!stemMatch) return false;
        } else if (!exactMatch) {
          return false;
        }
      }
      if (f.priority && card.priority !== f.priority) return false;
      if (f.assignee && card.assignee !== f.assignee) return false;
      if (f.author && card.author !== f.author) return false;
      if (f.tags.length > 0) {
        const cardTags = card.tags || [];
        if (!f.tags.some(t => cardTags.includes(t))) return false;
      }
      return true;
    });
  }

  function toJSON() {
    return { ..._state };
  }

  function _notify() {
    if (_onChange) _onChange(getState());
  }

  return { init, getState, applyFilters, toggleTag, removeTag, clear, hasActiveFilters, filterCards, toJSON };
})();
