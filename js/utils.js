'use strict';

const _escapeDiv = document.createElement('div');
function escapeHtml(str) {
  _escapeDiv.textContent = str;
  return _escapeDiv.innerHTML;
}

function getDragAfterElement(container, y, selector) {
  const elements = [...container.querySelectorAll(selector)];
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

function createRafDragAfterElement() {
  let _rafId = null;
  let _lastResult = null;
  let _pendingContainer = null;
  let _pendingY = 0;
  let _pendingSelector = '';

  function _process() {
    _rafId = null;
    if (_pendingContainer) {
      _lastResult = getDragAfterElement(_pendingContainer, _pendingY, _pendingSelector);
    }
  }

  return function throttledGetDragAfterElement(container, y, selector) {
    _pendingContainer = container;
    _pendingY = y;
    _pendingSelector = selector;
    if (!_rafId) {
      _rafId = requestAnimationFrame(_process);
    }
    return _lastResult;
  };
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
    bookmarkSlots: 22,
    widgets: { clock: true, weather: false, weatherCity: 'Moscow', weatherUnit: 'metric' }
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

function createSelect(options, value, placeholder) {
  const select = document.createElement('select');
  if (placeholder) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = placeholder;
    select.appendChild(opt);
  }
  const fragment = document.createDocumentFragment();
  for (const opt of options) {
    const el = document.createElement('option');
    el.value = opt.value;
    el.textContent = opt.label;
    if (opt.value === value) el.selected = true;
    fragment.appendChild(el);
  }
  select.appendChild(fragment);
  return select;
}

function renderColoredList(container, items, { renderItem, onClick }) {
  container.innerHTML = '';
  const fragment = document.createDocumentFragment();
  for (const item of items) {
    const el = renderItem(item);
    if (onClick) el.addEventListener('click', () => onClick(item));
    fragment.appendChild(el);
  }
  container.appendChild(fragment);
}

function handleModal(modalEl, { onSave, onCancel, onClose } = {}) {
  const cleanup = () => {
    modalEl.style.display = 'none';
    if (onClose) onClose();
  };

  const keyHandler = (e) => {
    if (e.key === 'Escape') cleanup();
    if (e.key === 'Enter' && onSave) onSave();
  };

  modalEl.addEventListener('mousedown', (e) => {
    if (e.target === modalEl) cleanup();
  });
  document.addEventListener('keydown', keyHandler);

  return { cleanup, keyHandler };
}


