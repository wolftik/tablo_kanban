'use strict';

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function getDragAfterElement(container, y) {
  const elements = [...container.querySelectorAll('.column-option-item:not(.dragging)')];
  if (elements.length === 0) return null;
  return elements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset, element: child };
    }
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY, element: null }).element;
}

function getCardDragAfterElement(container, y) {
  const cards = [...container.querySelectorAll('.kanban-card:not(.dragging)')];
  if (cards.length === 0) return null;
  return cards.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset, element: child };
    }
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY, element: null }).element;
}

function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function getDefaultSettings() {
  return {
    theme: 'system',
    language: 'ru',
    showFavicon: true,
    visibleBookmarks: [],
    performers: [],
    tags: [],
    authors: [],
    kanbanFilter: {},
    widgets: { clock: true }
  };
}

function applyTheme(theme) {
  if (!theme || theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

function moduleGuard(depName) {
  try {
    if (typeof eval(depName) === 'undefined') {
      console.error(`[Tablo] Missing dependency: ${depName}. Check script load order.`);
    }
  } catch {
    console.error(`[Tablo] Missing dependency: ${depName}. Check script load order.`);
  }
}
