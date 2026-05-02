# Tablo Kanban — Project Memory

## Goal

Create a Google Chrome extension (Manifest V3) called "Tablo Kanban". It replaces the new tab page with a bookmarks bar and a fully functional Kanban board.

## Architecture

```
js/
  storage-sync.js          # chrome.storage.sync + localStorage fallback (settings, bookmarks_display)
  storage-local.js         # chrome.storage.local + localStorage fallback (kanban data)
  kanban-constants.js      # Shared constants (priorities, default columns, storage key)
  kanban-filter.js         # Filter state management (search, priority, assignee, tags)
  kanban-card.js           # Card DOM creation and helpers
  kanban.js                # Kanban board core (IIFE module)
  bookmarks-context-menu.js # Context menu for bookmarks (IIFE module)
  bookmarks.js             # Bookmarks manager (IIFE module)
  widget-system.js         # Widget registration and lifecycle system
  newtab.js                # Entry point for newtab.html
  options.js               # Entry point for options.html
  utils.js                 # Shared utilities (escapeHtml, drag helpers)
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

## Fixed Issues (May 2026)
- Modular architecture: separated storage, kanban components, bookmark modules
- chrome.storage.local for board data (avoids sync quota limits)
- Context menu now closes on scroll/resize
- Window.open replaced with safe a.click() for bookmark navigation
- CSS custom properties for bookmark grid dimensions
- Added Columns tab to settings page with drag-and-drop reorder
- Removed unused code (getBookmarkDragAfterElement, dead CSS)
- Widgets zone prepared in HTML/CSS for future expansion
