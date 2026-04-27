# Fix List — Tablo Kanban

## 1. Критический: `_bindColumnReorder` — потеря всех колонок при reorder

**Файл:** `js/kanban.js`, строки 350-371

**Проблема:** Перед циклом `this._columns` очищается, затем внутри цикла поиск идёт по пустому массиву — все данные теряются.

```js
// БЫЛО (строки 354-367):
const columnEls = [...board.querySelectorAll('.kanban-column')];
this._columns = [];
for (const el of columnEls) {
  const colData = this._columns.find(c => c.id === el.dataset.columnId) || this._columns[0];
  this._columns.push(this._columns.find(c => c.id === el.dataset.columnId) || null);
}

const ids = columnEls.map(el => el.dataset.columnId);
const newColumns = [];
for (const id of ids) {
  const orig = this._columns.find(c => c.id === id);
  if (orig) newColumns.push(orig);
}
this._columns = newColumns;

// СТАЛО:
const columnEls = [...board.querySelectorAll('.kanban-column')];
const columnIds = columnEls.map(el => el.dataset.columnId);
const newColumns = [];
for (const id of columnIds) {
  const orig = this._columns.find(c => c.id === id);
  if (orig) newColumns.push(orig);
}
this._columns = newColumns;
```

---

## 2. Критический: `_getDragAfterElement` падает на пустом контейнере

**Файл:** `js/kanban.js`, строки 272-283

**Проблема:** При пустом `cards` reduce возвращает `{ offset, element: undefined }`. Далее `afterElement.dataset.cardId` выбрасывает TypeError.

```js
// БЫЛО:
_getDragAfterElement(container, y) {
  const cards = [...container.querySelectorAll('.kanban-card:not(.dragging)')];
  return cards.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// СТАЛО:
_getDragAfterElement(container, y) {
  const cards = [...container.querySelectorAll('.kanban-card:not(.dragging)')];
  if (cards.length === 0) return null;
  return cards.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY, element: null }).element;
}
```

Аналогично в `js/options.js:156-166` — добавить `if (elements.length === 0) return null;`.

---

## 3. Баг: `new URL(bm.url)` без try/catch

**Файл:** `js/bookmarks.js`, строка 82

**Проблема:** Некорректный URL ломает весь рендер.

```js
// БЫЛО (строка 82):
favicon.src = `chrome://favicon/${new URL(bm.url).hostname}`;

// СТАЛО:
let hostname;
try {
  hostname = new URL(bm.url).hostname;
} catch {
  hostname = 'unknown';
}
favicon.src = `chrome://favicon/${hostname}`;
```

---

## 4. Баг: `showFavicon` всегда true

**Файл:** `js/options.js`, строка 241

**Проблема:** `checked !== false` — при `checked = false` результат `true`.

```js
// БЫЛО:
const showFavicon = document.getElementById('show-favicon-option')?.checked !== false;

// СТАЛО:
const showFaviconEl = document.getElementById('show-favicon-option');
const showFavicon = showFaviconEl ? !!showFaviconEl.checked : true;
```

---

## 5. Баг: слушатели drag/drop теряются при повторном `renderColumnsList()`

**Файл:** `js/options.js`, строки 114-129

**Проблема:** `renderColumnsList()` создаёт новые DOM-элементы, но слушатели привязаны только к старым.

```js
// Заменить setupColumnReorder (строки 111-154) на делегирование:
function setupColumnReorder(list) {
  let draggedItem = null;

  list.addEventListener('dragstart', (e) => {
    const item = e.target.closest('.column-option-item');
    if (!item) return;
    draggedItem = item;
    item.style.opacity = '0.5';
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.dataset.columnId);
  });

  list.addEventListener('dragend', (e) => {
    if (draggedItem) draggedItem.style.opacity = '1';
    draggedItem = null;
    list.querySelectorAll('.column-option-item').forEach(i => {
      i.style.borderTop = '';
    });
  });

  list.addEventListener('dragover', (e) => {
    e.preventDefault();
    const afterElement = getDragAfterElement(list, e.clientY);
    if (draggedItem) {
      if (afterElement == null) {
        list.appendChild(draggedItem);
      } else {
        list.insertBefore(draggedItem, afterElement);
      }
    }
  });

  list.addEventListener('drop', (e) => {
    e.preventDefault();
    const newOrder = [...list.querySelectorAll('.column-option-item')];
    const newColumns = [];
    for (const el of newOrder) {
      const col = columns.find(c => c.id === el.dataset.columnId);
      if (col) newColumns.push(col);
    }
    columns = newColumns;
    renderColumnsList();
  });
}
```

Удалить `list.querySelectorAll('.column-option-item').forEach(...)` из `renderColumnsList` (строки 114-129 оригинала).

---

## 6. Архитектурное: дублирование `_getDragAfterElement`

**Файл:** `js/kanban.js` (строки 272-283), `js/options.js` (строки 156-166)

Вынести в `js/storage.js` или отдельный `js/utils.js`:

```js
function getDragAfterElement(container, y) {
  const elements = [...container.querySelectorAll('.column-option-item:not([style*="opacity: 0.5"])')];
  if (elements.length === 0) return null;
  return elements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
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
      return { offset: offset, element: child };
    }
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY, element: null }).element;
}
```

Заменить локальные реализации на вызовы этих функций. Для reorder колонок в `kanban.js:326-348` — там горизонтальная версия (использует `e.clientX` и `box.left`), её можно вынести как `getCardDragAfterElementH(container, x)`.

---

## 7. Архитектурное: `_generateId` помечен как приватный, но используется извне

**Файл:** `js/storage.js` (строка 73), вызовы в `js/bookmarks.js:17`, `js/kanban.js:426`, `js/kanban.js:457`, `js/options.js:229`

**Решение:** Убрать `_` префикс:

```js
// БЫЛО:
_generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// СТАЛО:
generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2);
}
```

Заменить все вызовы `Storage._generateId()` на `Storage.generateId()`.

---

## 8. Архитектурное: `Storage.getMultiple` / `setMultiple` последовательные

**Файл:** `js/storage.js`, строки 39-51

```js
// БЫЛО:
async getMultiple(keys) {
  const result = {};
  for (const key of keys) {
    result[key] = await this.get(key);
  }
  return result;
}

async setMultiple(items) {
  for (const [key, value] of Object.entries(items)) {
    await this.set(key, value);
  }
}

// СТАЛО:
async getMultiple(keys) {
  if (this._useSync) {
    try {
      const result = await chrome.storage.sync.get(keys);
      return result;
    } catch {}
  }
  const result = {};
  for (const key of keys) {
    const val = localStorage.getItem(key);
    result[key] = val ? JSON.parse(val) : undefined;
  }
  return result;
}

async setMultiple(items) {
  if (this._useSync) {
    await chrome.storage.sync.set(items);
  }
  for (const [key, value] of Object.entries(items)) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }
}
```

---

## 9. UX: нет подтверждения удаления колонки

**Файл:** `js/kanban.js`, строки 528-536

```js
// БЫЛО:
_deleteColumn(columnId) {
  const col = this._columns.find(c => c.id === columnId);
  if (!col) return;
  if (this._columns.length <= 1) return;

  this._columns = this._columns.filter(c => c.id !== columnId);
  this._renderBoard();
  this.save();
}

// СТАЛО:
_deleteColumn(columnId) {
  const col = this._columns.find(c => c.id === columnId);
  if (!col) return;
  if (this._columns.length <= 1) return;

  if (!confirm('Удалить колонку "' + col.title + '" и все её задачи?')) return;

  this._columns = this._columns.filter(c => c.id !== columnId);
  this._renderBoard();
  this.save();
}
```

---

## 10. UX: нет подтверждения удаления карточки

**Файл:** `js/kanban.js`, строки 442-453

```js
// БЫЛО:
_deleteCard() {
  if (!this._editingCard || this._editingCard._isTemporary) return;

  const col = this._columns.find(c => c.id === this._editingColumnId);
  if (col) {
    col.cards = col.cards.filter(c => c.id !== this._editingCard.id);
  }

  this._closeModal();
  this._renderBoard();
  this.save();
}

// СТАЛО:
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
}
```

---

## 11. CSS: перенос `--bookmarks-border` в `kanban.css`

**Файл:** `css/kanban.css`, добавить в `:root`

```css
:root {
  ...
  --bookmarks-border: #e2e8f0;
}
```

Убрать fallback из строк 281 и 313:
```css
/* БЫЛО */
border: 2px dashed var(--bookmarks-border, #e2e8f0);
/* СТАЛО */
border: 2px dashed var(--bookmarks-border);
```

---

## 12. CSS: публичный класс для `.bookmark-delete` display

**Файл:** `css/bookmarks.css`, строки 107-108, 122-124

```css
/* БЫЛО: */
.bookmark-item .bookmark-delete {
  display: none;
}
.bookmark-item:hover .bookmark-delete {
  display: flex;
}

/* СТАЛО — использовать visibility для анимации: */
.bookmark-item .bookmark-delete {
  visibility: hidden;
  opacity: 0;
  transition: visibility 0.15s, opacity 0.15s;
}
.bookmark-item:hover .bookmark-delete {
  visibility: visible;
  opacity: 1;
}
```

`display:none` не позволяет анимировать, а `visibility:hidden` сохраняет layout и позволяет transition.
