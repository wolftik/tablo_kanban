'use strict';

const KanbanCard = (() => {

  function hashToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    const s = 55 + (Math.abs(hash >> 8) % 20);
    const l = 50 + (Math.abs(hash >> 4) % 10);
    return `hsl(${h}, ${s}%, ${l}%)`;
  }

  function getTagsForDisplay(tagIds, tagById, tags) {
    if (tagById) return tagIds.map(id => tagById(id)).filter(Boolean);
    if (!tags) return [];
    return tagIds.map(id => tags.find(t => t.id === id)).filter(Boolean);
  }
  function create(card, columnId, performers, tags, tagById) {
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

    if (card.createdAt) {
      const isFirst = KanbanStore.isFirstColumn(columnId);
      const isClosed = !!card.closedAt;
      if (isFirst || isClosed) {
        const age = isClosed ? (card.closedAt - card.createdAt) : (Date.now() - card.createdAt);
        if (age > KanbanConstants.AGING_FIRE_MS) {
          const fire = document.createElement('span');
          fire.className = 'card-aging-badge card-fire';
          fire.textContent = '\uD83D\uDD25';
          fire.title = I18n.t('card.fire.tooltip');
          cardEl.appendChild(fire);
        } else if (age > KanbanConstants.AGING_SNAIL_MS) {
          const snail = document.createElement('span');
          snail.className = 'card-aging-badge card-snail';
          snail.textContent = '\uD83D\uDC0C';
          snail.title = I18n.t('card.old.tooltip');
          cardEl.appendChild(snail);
        }
      }
    }

    const titleEl = document.createElement('div');
    titleEl.className = 'card-title';
    titleEl.textContent = card.title;
    cardEl.appendChild(titleEl);

    if (card.description) {
      const descEl = document.createElement('div');
      descEl.className = 'card-description';
      if (/<[a-z][\s\S]*>/i.test(card.description)) {
        descEl.innerHTML = card.description;
      } else {
        descEl.textContent = card.description;
      }
      cardEl.appendChild(descEl);
    }

    const meta = document.createElement('div');
    meta.className = 'card-meta';

    if (card.createdAt) {
      const dateEl = document.createElement('span');
      dateEl.className = 'card-date';
      const d = new Date(card.createdAt);
      dateEl.textContent = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
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
      avatar.style.background = performer ? performer.color : hashToColor(card.assignee);
      avatar.textContent = initial;
      avatar.title = card.assignee;
      assigneeEl.appendChild(avatar);
      cardEl.appendChild(assigneeEl);
    }

    if (card.tags && card.tags.length > 0) {
      const tagsContainer = document.createElement('div');
      tagsContainer.className = 'card-tags';
      const displayTags = getTagsForDisplay(card.tags, tagById, tags);
      for (const tag of displayTags) {
        const badge = document.createElement('span');
        badge.className = 'tag-badge';
        badge.textContent = tag.name;
        badge.style.background = tag.color;
        tagsContainer.appendChild(badge);
      }
      cardEl.appendChild(tagsContainer);
    }

    if (card.links && card.links.length > 0) {
      const linksContainer = document.createElement('div');
      linksContainer.className = 'card-links';
      const maxLinks = 3;
      const showLinks = card.links.slice(0, maxLinks);
      for (const link of showLinks) {
        const linkEl = document.createElement('a');
        linkEl.className = 'card-link-block';
        linkEl.href = link.url;
        linkEl.target = '_blank';
        linkEl.rel = 'noopener';
        linkEl.addEventListener('click', (e) => e.stopPropagation());
        let hostname = '';
        try { hostname = new URL(link.url).hostname; } catch (e) { hostname = ''; }
        const displayText = link.title || hostname + (new URL(link.url).pathname !== '/' ? '…' : '');
        linkEl.innerHTML =
          '<img class="card-link-favicon" src="https://www.google.com/s2/favicons?domain=' + escapeHtml(hostname) + '&sz=16" onerror="this.style.display=\'none\'">' +
          '<span class="card-link-text">' + escapeHtml(displayText) + '</span>';
        linksContainer.appendChild(linkEl);
      }
      if (card.links.length > maxLinks) {
        const more = document.createElement('span');
        more.className = 'card-links-more';
        more.textContent = '+' + (card.links.length - maxLinks);
        linksContainer.appendChild(more);
      }
      cardEl.appendChild(linksContainer);
    }

    if (card.checklist && card.checklist.length > 0) {
      const cl = document.createElement('div');
      cl.className = 'card-checklist';
      const { done, total } = _countChecklistItems(card.checklist);
      // Thin progress bar
      if (total > 0) {
        const bar = document.createElement('div');
        bar.className = 'checklist-progress';
        bar.title = done + '/' + total;
        bar.innerHTML = '<div class="checklist-progress-fill" style="width:' + Math.round(done / total * 100) + '%"></div>';
        cl.appendChild(bar);
      }
      // Show first 5 items with clickable checkboxes
      const maxVisible = 5;
      const showItems = card.checklist.slice(0, maxVisible);
      for (const item of showItems) {
        const itemEl = document.createElement('div');
        itemEl.className = 'card-checklist-item';
        itemEl.dataset.checklistItemId = item.id;
        const check = document.createElement('span');
        check.className = 'card-checklist-check' + (item.checked ? ' checked' : '');
        check.textContent = item.checked ? '\u2713' : '';
        itemEl.appendChild(check);
        const text = document.createElement('span');
        text.className = 'card-checklist-text';
        text.textContent = item.text || '';
        itemEl.appendChild(text);
        cl.appendChild(itemEl);
      }
      if (card.checklist.length > maxVisible) {
        const more = document.createElement('span');
        more.className = 'card-checklist-more';
        more.textContent = '+' + (card.checklist.length - maxVisible);
        cl.appendChild(more);
      }
      cardEl.appendChild(cl);
    }

    return cardEl;
  }

  function createPlaceholder() {
    const ph = document.createElement('div');
    ph.className = 'drop-placeholder';
    return ph;
  }

  function _countChecklistItems(items) {
    const done = items.filter(i => i.checked).length;
    return { done, total: items.length };
  }

  return { create, createPlaceholder, hashToColor, getTagsForDisplay, _countChecklistItems };
})();
