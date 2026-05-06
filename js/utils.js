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
  // Two-phase approach to eliminate micro-freezes on dragover:
  // Phase 1 (synchronous, on each dragover) — save cursor coords only, no DOM reads/writes
  // Phase 2 (requestAnimationFrame) — compute getBoundingClientRect + move placeholder,
  //   runs at most 60x/s instead of potentially hundreds of dragover events per second.
  //
  // The returned function receives a callback `updatePlaceholderFn(container, afterElement)`
  // that applies the DOM mutation inside the same rAF tick, so even the insertBefore/appendChild
  // happens layout-cold (browser coalesces all style/layout changes into the next frame).
  let _rafId = null;
  let _pendingContainer = null;
  let _pendingY = 0;
  let _pendingSelector = '';
  /** @type {Function|null} */
  let _pendingPlaceholderFn = null;
  /** @type {Map<Element,{lastResult:Element|null}>} */
  const _cache = new Map();
  /** @type {Set<Element>} */
  const _dirtyContainers = new Set();

  function _process() {
    _rafId = null;
    const container = _pendingContainer;
    const fn = _pendingPlaceholderFn;
    if (container) {
      const result = getDragAfterElement(container, _pendingY, _pendingSelector);
      _cache.set(container, { lastResult: result });
      if (fn) {
        fn(container, result);
      }
    }
    _pendingPlaceholderFn = null;
    _dirtyContainers.clear();
  }

  /**
   * @param {Element} container
   * @param {number} y
   * @param {string} selector
   * @param {Function} updateFn - called inside rAF: updateFn(container, afterElement)
   */
  return function throttledGetDragAfterElement(container, y, selector, updateFn) {
    _pendingContainer = container;
    _pendingY = y;
    _pendingSelector = selector;
    _pendingPlaceholderFn = updateFn;
    if (!_rafId) {
      _rafId = requestAnimationFrame(_process);
    }
  };
}

/**
 * Snowball-based Russian stemmer.
 * Port of the classic algorithm by Nikita Kronrod / Ilya Segalovich.
 */
const RussianStemmer = {
  stem(word) {
    const a = word.toLowerCase();
    const RV_RE = /^(.*?[аеиоуыэюя])(.*)$/i;
    const PERFECTIVE_GERUND_RE = /(ив|ивши|ившись|ыв|ывши|ывшись|в|вши|вшись)$/;
    const ADJECTIVE_RE = /(ее|ие|ые|ое|ими|ыми|ей|ий|ый|ой|ем|им|ым|ом|его|ого|ему|ому|их|ых|ую|юю|ая|яя|ою|ею)$/;
    const PARTICIPLE_RE = /(ем|нн|вш|ющ|щ|вш|ющ|ем|нн|т)$/;
    const REFLEXIVE_RE = /(ся|сь)$/;
    const VERB_RE = /(ла|на|ете|йте|ли|й|л|ем|н|ло|но|ет|ют|ны|ть|ешь|нно|ла|на|ете|йте|ли|й|л|ем|н|ло|но|ет|ют|ны|ть|ешь|нно)$/;
    const NOUN_RE = /(а|ев|ов|ие|ье|е|иями|ями|ами|еи|ии|и|ией|ей|ой|ий|й|иям|ям|ием|ем|ам|ом|о|у|ах|иях|ях|ы|ь|ию|ью|ю|ия|ья|я)$/;
    const DERIVATIONAL_RE = /(ость|ост)$/;
    const SUPERLATIVE_RE = /(ейш|ейше)$/;
    const I_RE = /и$/;

    let rv = a.replace(RV_RE, '$2');
    if (!rv) rv = a;

    if (PERFECTIVE_GERUND_RE.test(rv)) {
      rv = rv.replace(PERFECTIVE_GERUND_RE, '');
    } else {
      if (REFLEXIVE_RE.test(rv)) rv = rv.replace(REFLEXIVE_RE, '');
      if (ADJECTIVE_RE.test(rv)) {
        rv = rv.replace(ADJECTIVE_RE, '');
        rv = rv.replace(PARTICIPLE_RE, '');
      } else if (VERB_RE.test(rv)) {
        rv = rv.replace(VERB_RE, '');
      } else if (NOUN_RE.test(rv)) {
        rv = rv.replace(NOUN_RE, '');
      }
    }

    rv = rv.replace(I_RE, '');

    if (DERIVATIONAL_RE.test(rv)) {
      rv = rv.replace(DERIVATIONAL_RE, '');
    }

    if (SUPERLATIVE_RE.test(rv)) {
      rv = rv.replace(SUPERLATIVE_RE, '');
    }

    rv = rv.replace(/нн$/, 'н');

    return rv;
  }
};

function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function getDefaultSettings() {
  return {
    theme: 'system',
    language: 'en',
    showFavicon: true,

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


