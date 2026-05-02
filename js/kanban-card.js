'use strict';

moduleGuard('I18n');

const KanbanCard = (() => {

  function _hashToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    const s = 55 + (Math.abs(hash >> 8) % 20);
    const l = 50 + (Math.abs(hash >> 4) % 10);
    return `hsl(${h}, ${s}%, ${l}%)`;
  }

  function _getTagsForDisplay(tagIds, tagById, tags) {
    if (tagById) return tagIds.map(id => tagById(id)).filter(Boolean);
    if (!tags) return [];
    return tagIds.map(id => tags.find(t => t.id === id)).filter(Boolean);
  }
  function create(card, columnId, performers, tags) {
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
      dateEl.textContent = d.toLocaleDateString(I18n.localeToBCP47(I18n.getLang()), { day: '2-digit', month: '2-digit' });
      meta.appendChild(dateEl);
    }

    if (card.priority) {
      const badge = document.createElement('span');
      badge.className = 'card-priority-badge priority-' + card.priority;
      badge.textContent = KanbanConstants.getPriorityLabel(card.priority);
      meta.appendChild(badge);
    }

    cardEl.appendChild(meta);

    if (card.assignee) {
      const assigneeEl = document.createElement('div');
      assigneeEl.className = 'card-assignee';
      const initial = card.assignee.charAt(0).toUpperCase();
      const avatar = document.createElement('span');
      avatar.className = 'assignee-avatar';
      const performer = (performers || []).find(p => p.name === card.assignee);
      avatar.style.background = performer ? performer.color : _hashToColor(card.assignee);
      avatar.textContent = initial;
      avatar.title = card.assignee;
      assigneeEl.appendChild(avatar);
      cardEl.appendChild(assigneeEl);
    }

    if (card.tags && card.tags.length > 0) {
      const tagsContainer = document.createElement('div');
      tagsContainer.className = 'card-tags';
      const displayTags = _getTagsForDisplay(card.tags, null, tags);
      for (const tag of displayTags) {
        const badge = document.createElement('span');
        badge.className = 'tag-badge';
        badge.textContent = tag.name;
        badge.style.background = tag.color;
        tagsContainer.appendChild(badge);
      }
      cardEl.appendChild(tagsContainer);
    }

    return cardEl;
  }

  function createPlaceholder() {
    const ph = document.createElement('div');
    ph.className = 'drop-placeholder';
    return ph;
  }

  return { create, createPlaceholder, _hashToColor, _getTagsForDisplay };
})();
