# Tablo Kanban — Project Memory

## Goal

Create a Google Chrome extension (Manifest V3) called "Tablo Kanban". It replaces the new tab page with a bookmarks bar and a fully functional Kanban board.

## Architecture

```
js/
  storage-sync.js          # chrome.storage.sync + localStorage fallback (settings, bookmarks_display)
  storage-local.js         # chrome.storage.local + localStorage fallback (kanban data)
  kanban-constants.js      # Shared constants (priorities, default columns/tags/performers, storage key)
  kanban-filter.js         # Filter state management (search, priority, assignee, tags)
  kanban-card.js           # Card DOM creation and helpers
  kanban.js                # Kanban board core (IIFE module)
  bookmarks-context-menu.js # Context menu for bookmarks (IIFE module)
  bookmarks.js             # Bookmarks manager (IIFE module)
  widget-system.js         # Widget registration and lifecycle system
  newtab.js                # Entry point for newtab.html
  options.js               # Entry point for options.html
  utils.js                 # Shared utilities (escapeHtml, drag helpers, generateId, theme)
```

### Module Pattern
All JS files use IIFE (Immediately Invoked Function Expression) pattern with `'use strict'`, exposing a single global const per module. This avoids global scope pollution while maintaining compatibility with Chrome Extension CSP.

### Storage Strategy
- **chrome.storage.sync** (`StorageSync`): Settings, bookmarks_display, tags, performers — data that benefits from cross-device sync (limited to ~100 KB).
- **chrome.storage.local** (`StorageLocal`): Kanban board data (columns, cards) — potentially large, no size limit concern (~10 MB available).

### Widget System
The `WidgetSystem` provides a lifecycle for future widgets (weather, clock, currency rates):
- `register(name, { init })` — register a widget module
- `initAll()` — initialize all registered widgets
- Widgets render into `#widgets-zone` in the head-bar area

## Features
- Bookmarks bar with 22 slots (11×2 grid), drag-and-drop positioning
- Google favicons for bookmarks
- Context menu (edit/delete) for bookmarks
- Kanban board with drag-and-drop cards and columns
- Card priorities (Low, Medium, High, Urgent) with color bars and badges
- Column editing (title, color) inline
- Filter by assignee, priority, tags, and text search
- Tags system with color-coded badges
- Assignees/Authors with colored avatars
- Theme: Light, Dark, System
- Card sizes: Compact, Standard, Large
- Settings page with tabs (Columns, Tags, Performers, Authors, Appearance)

## Internationalization (i18n)

### Module Structure
`js/i18n.js` — IIFE module exposing `I18n` global with:
- `init()` — async, loads saved language from storage, applies translations to DOM
- `t(key, args)` — returns translated string for current language, supports `{placeholder}` interpolation
- `getLang()` / `setLang(locale)` — get/set current language, saves to storage
- `applyTranslations()` — re-scans DOM for `data-i18n`, `data-i18n-placeholder`, `data-i18n-title` attributes
- `localeToBCP47(lang)` — maps `'ru'`→`'ru-RU'`, `'en'`→`'en-US'`, `'zh'`→`'zh-CN'`

### Supported Languages
- Russian (`ru`) — default, backward compatible
- English (`en`)
- Simplified Chinese (`zh` / 简体中文)

### Translation Keys
All translations live in `LOCALES` object inside `js/i18n.js`. ~65 keys organized by domain:
- `bookmark.*`, `filter.*`, `priority.*`, `tags.*`, `modal.*`, `column.*`, `card.*`, `settings.*`, `options.*`

### How to Add a New Language
1. Add a new locale object to `LOCALES` in `js/i18n.js`
2. Add all ~65 translation keys
3. Add `<option>` to the language selector in `views/options.html`
4. Add BCP-47 mapping in `localeToBCP47()`

### Script Load Order
`i18n.js` must load **first** — before `utils.js` — in both HTML files:
```html
<script src="../js/i18n.js"></script>
<script src="../js/utils.js"></script>
```

### DOM Translation Attributes
- `data-i18n="key"` — translates `textContent`
- `data-i18n-placeholder="key"` — translates `placeholder` attribute
- `data-i18n-title="key"` — translates `title` attribute
- `data-i18n-args='{"count":5}'` — interpolation arguments (optional)

### Dynamic Strings in JS
Dynamically created elements call `I18n.t()` at creation time. They do NOT use `data-i18n` attributes. Confirm dialogs call `I18n.t()` before the blocking `confirm()` call.

## Fixed Issues (May 2026)
- Modular architecture: separated storage, kanban components, bookmark modules
- chrome.storage.local for board data (avoids sync quota limits)
- Context menu now closes on scroll/resize
- Window.open replaced with safe a.click() for bookmark navigation
- CSS custom properties for bookmark grid dimensions
- Added Columns tab to settings page with drag-and-drop reorder
- Removed unused code (getBookmarkDragAfterElement, getCardDragAfterElement, dead CSS)
- Default tags/performers data centralized in `kanban-constants.js` (eliminated duplication across `kanban.js` and `options.js`)
- Consolidated `getDragAfterElement` and `getCardDragAfterElement` into single parameterized function
- Removed dead CSS: `.col-color`, `.folder-check-item`, `.folder-icon`, `.folder-name`, `.drag-over-card`
- Removed orphaned JS removal of `.drag-over-card` class
- Consolidated duplicate Escape keydown handler: `BookmarksContextMenu.hide()` moved from `bookmarks.js` to `newtab.js`
- Widgets zone prepared in HTML/CSS for future expansion
