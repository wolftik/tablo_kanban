'use strict';

const KanbanFilter = (() => {
  moduleGuard('StorageSync');
  let _state = { search: '', priority: '', assignee: '', tags: [] };
  let _onChange = null;

  function init(state, onChange) {
    _state = { ..._state, ...(state || {}) };
    _onChange = onChange;
  }

  function getState() {
    return { ..._state };
  }

  function applyFilters(search, priority, assignee) {
    _state.search = search.trim();
    _state.priority = priority;
    _state.assignee = assignee;
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
    _state = { search: '', priority: '', assignee: '', tags: [] };
    _notify();
  }

  function hasActiveFilters() {
    return !!( _state.search || _state.priority || _state.assignee || _state.tags.length > 0);
  }

  function filterCards(cards) {
    const f = _state;
    return cards.filter(card => {
      if (f.search) {
        const q = f.search.toLowerCase();
        if (!card.title.toLowerCase().includes(q) &&
            !(card.description || '').toLowerCase().includes(q) &&
            !(card.assignee || '').toLowerCase().includes(q) &&
            !(card.author || '').toLowerCase().includes(q)) {
          return false;
        }
      }
      if (f.priority && card.priority !== f.priority) return false;
      if (f.assignee && card.assignee !== f.assignee) return false;
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
