# Tablo Kanban — Project Memory

## Goal

Create a Google Chrome extension (Manifest V3) called "Tablo Kanban". It replaces the new tab page with a 20/80 split layout:

- **Top 20%**: A bookmarks bar displaying Chrome bookmarks and user-added URLs.
- **Bottom 80%**: A fully functional Kanban board (Backlog, To Do, In Progress, Review, Done).
- **Settings page**: To manage columns, appearance (theme, card size), and bookmark visibility.

## Instructions

- The extension should be built with **Vanilla HTML/CSS/JS** (no frameworks).
- **Data Storage**: Use `chrome.storage.sync` with a `localStorage` fallback.
- **Drag & Drop**: Use native HTML5 Drag and Drop API.
- **Bookmarks**: Integrate with `chrome.bookmarks` API, display favicons via `chrome://favicon/`.
- **Theming**: Support Light, Dark, and System themes using CSS custom properties.
- Default columns: Backlog, To Do, In Progress, Review, Done.
- **Card priorities**: Low, Medium, High, Urgent with color-coded priority bars and badges.
- **Column customization**: Users can change column colors and reorder columns.
- **UI language**: Russian.

## Discoveries

- The `Storage` utility successfully abstracts both `chrome.storage.sync` and `localStorage`.
- The layout strictly separates the bookmarks bar (`height: 48px`) and the kanban board (`height: calc(100vh - 48px)`).
- Drag helper utilities (`getDragAfterElement`, `getCardDragAfterElement`) were extracted to `js/utils.js` to avoid code duplication between kanban.js and options.js.
- Card priority levels (low, medium, high, urgent) are rendered with color-coded priority bars on card edges and badges in the card meta.
- Column color indicators are displayed as colored dots in column headers.
- The settings page has 4 tabs: Columns, Appearance, Bookmarks, About.

## Accomplished

- **Created**: `manifest.json` (MV3, newtab override, permissions, action).
- **Created**: `icons/icon16.svg`, `icons/icon48.svg`, `icons/icon128.svg`.
- **Created**: `views/newtab.html` (HTML structure for the app, modals).
- **Created**: `views/options.html` (Settings UI with 4 tabs: Columns, Appearance, Bookmarks, About).
- **Created**: `css/bookmarks.css` (Styles for bookmarks bar, modals).
- **Created**: `css/kanban.css` (Styles for board, columns, cards, drag placeholders, priority bars).
- **Created**: `css/options.css` (Styles for settings page).
- **Created**: `js/storage.js` (Data storage abstraction, default values generator).
- **Created**: `js/bookmarks.js` (Chrome Bookmarks API wrapper, rendering, display management, favicon support).
- **Created**: `js/kanban.js` (Kanban board state, rendering columns/cards, drag-and-drop logic for cards and columns, modal interactions, priority support, column color editing).
- **Created**: `js/newtab.js` (Entry point for `newtab.html` - initializes Storage, BookmarksManager, KanbanBoard, theme, bookmark modal).
- **Created**: `js/options.js` (Entry point for `options.html` - tab switching, column list with drag reorder, bookmark folders checkbox, save settings).
- **Created**: `js/utils.js` (Shared drag helper utilities: `getDragAfterElement`, `getCardDragAfterElement`).

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
