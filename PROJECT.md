# Tablo Kanban — Project Memory

## Goal

Create a Google Chrome extension (Manifest V3) called "Tablo Kanban". It replaces the new tab page with a 20/80 split layout:

- **Top section**: A bookmarks bar (220px) displaying Chrome bookmarks and user-added URLs, supporting folders/subfolders and favicons.
- **Bottom section**: A fully functional Kanban board (Backlog, To Do, In Progress, Review, Done).
- **Settings page**: To manage columns, appearance (theme, card size), and bookmark visibility.

## Instructions

- The extension should be built with **Vanilla HTML/CSS/JS** (no frameworks).
- **Data Storage**: Use `chrome.storage.sync` with a `localStorage` fallback.
- **Drag & Drop**: Use native HTML5 Drag and Drop API.
- **Bookmarks**: Integrate with `chrome.bookmarks` API, display favicons via `chrome://favicon/`.
- **Theming**: Support Light, Dark, and System themes using CSS custom properties.
- Default columns: Backlog, To Do, In Progress, Review, Done.
- **Card priorities**: Low, Medium, High, Urgent with color-coded priority bars and badges.
- **Column customization**: Users can change column colors (color picker), add color indicators, and reorder columns.
- **Bookmarks**: Support for bookmark folders/subfolders with dropdown menus, delete buttons on hover, and favicon display.
- **UI language**: Russian.

## Discoveries

- The `Storage` utility successfully abstracts both `chrome.storage.sync` and `localStorage`.
- The layout strictly separates the bookmarks bar (`height: 220px`) and the kanban board (`height: calc(100vh - 285px)`).
- Drag helper utilities (`getDragAfterElement`, `getCardDragAfterElement`, `getBookmarkDragAfterElement`) were extracted to `js/utils.js` to avoid code duplication.
- Card priority levels (low, medium, high, urgent) are rendered with color-coded priority bars on card edges and badges in the card meta.
- Column color indicators are displayed as colored dots in column headers.
- The settings page has 4 tabs: Columns, Appearance, Bookmarks, About.
- Bookmarks bar uses CSS Grid layout (12 columns x 2 rows = 24 tiles) with placeholder tiles for adding new bookmarks.
- Bookmark drag-and-drop: `dragover` handler only updates visual highlighting (`.drag-over` class), `drop` handler calculates position from `e.clientY` and updates DOM before saving.
- New bookmarks can be positioned at specific grid slots by clicking placeholders (position stored in `modal.dataset.targetIndex`).
- Placeholders support `.active` state for visual feedback when a target position is selected.

## Accomplished

- **Created**: `manifest.json` (MV3, `chrome_url_overrides.newtab`, permissions, action).
- **Created**: `icons/icon16.svg`, `icons/icon48.svg`, `icons/icon128.svg`.
- **Created**: `views/newtab.html` (HTML structure for the app, modals).
- **Created**: `views/options.html` (Settings UI with 4 tabs: Columns, Appearance, Bookmarks, About).
- **Created**: `css/bookmarks.css` (Styles for bookmarks bar, modals, placeholders, active state).
- **Created**: `css/kanban.css` (Styles for board, columns, cards, drag placeholders, priority bars).
- **Created**: `css/options.css` (Styles for settings page).
- **Created**: `js/storage.js` (Data storage abstraction, default values generator).
- **Created**: `js/bookmarks.js` (Chrome Bookmarks API wrapper, rendering, display management, favicon support, drag-and-drop, placeholder positioning).
- **Created**: `js/kanban.js` (Kanban board state, rendering columns/cards, drag-and-drop logic for cards and columns, modal interactions, priority support, column color editing).
- **Created**: `js/newtab.js` (Entry point for `newtab.html` - initializes Storage, BookmarksManager, KanbanBoard, theme, bookmark modal with position support).
- **Created**: `js/options.js` (Entry point for `options.html` - tab switching, column list with drag reorder, bookmark folders checkbox, save settings).
- **Created**: `js/utils.js` (Shared drag helper utilities: `getDragAfterElement`, `getCardDragAfterElement`, `getBookmarkDragAfterElement`).
- **Fixed**: Bookmark drag-and-drop bug — `getBookmarkDragAfterElement` excluded `.bookmark-placeholder` elements; `drop` handler now moves DOM element before saving; `dragover` handler simplified to visual-only updates.
- **Added**: Bookmark positioning feature — placeholders carry `data-index`, click selects target grid position, `addDisplayedBookmark` accepts `position` parameter for `splice` insertion, modal tracks `targetIndex` for correct placement.

## Project Structure

```
manifest.json
icons/
  icon16.svg
  icon48.svg
  icon128.svg
views/
  newtab.html
  options.html
css/
  bookmarks.css
  kanban.css
  options.css
js/
  storage.js
  bookmarks.js
  kanban.js
  newtab.js
  options.js
  utils.js
```

All files are complete and the extension is ready to load in Chrome (`chrome://extensions/` → Load unpacked).

### Fixed Issues (May 2026)

- **Fixed**: Added `chrome_url_overrides.newtab` to `manifest.json` — the extension now actually replaces the new tab page.
- **Fixed**: Options page save no longer drops `performers` and `kanbanFilter` from settings.
- **Fixed**: XSS vulnerabilities — tag/ bookmark names are escaped before innerHTML insertion.
- **Fixed**: Removed duplicate `_getDragAfterElement` in `kanban.js` (now delegates to `getCardDragAfterElement` from `utils.js`).
- **Fixed**: Extracted `BOOKMARK_SLOTS = 22` as module-level constant in `bookmarks.js`, replacing scattered magic numbers.
- **Fixed**: Drag handle in options page now uses Unicode `\u2630` instead of HTML entity via `textContent`.
- **Fixed**: `_hashToColor` now varies both saturation and lightness for better color distribution.
- **Fixed**: URL parsing in bookmark save modal is wrapped in try-catch to prevent crashes on invalid URLs.
- **Added**: `escapeHtml()` utility function in `utils.js` for safe HTML interpolation.
