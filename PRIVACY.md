# Privacy Policy — Tablo Kanban

**Last updated:** June 25, 2026

## Overview

Tablo Kanban is a Chrome/Edge/Yandex extension that provides a bookmarks bar and a Kanban board, opened via the toolbar icon or set as a custom homepage. This policy explains what data the extension accesses, stores, and shares.

## Data Collection and Usage

### Data Stored Locally

| Data | Storage | Purpose |
|------|---------|---------|
 | Kanban board (columns, cards, tags, performers, authors) | `localStorage` (with `kanban_` prefix) | Core functionality — your task board |
| Settings (theme, language, widget preferences, bookmark slots) | `chrome.storage.sync` | Settings sync across your Chrome devices |
| Displayed bookmarks list | `chrome.storage.sync` | Which bookmarks you have placed on the board |
| Widget preferences (clock, weather, quotes, coin, pomodoro, alarm/timer) | `chrome.storage.sync` | Toggle states and settings for optional widgets |
| Yandex Disk OAuth token | `chrome.storage.sync` | Optional cloud sync via Yandex Disk |
| Yandex Disk Client ID | `chrome.storage.sync` | Required for Yandex Disk OAuth flow |
| Sync provider selection | `chrome.storage.sync` | Which sync provider is selected (Google Drive / Yandex Disk) |

All data stays in your browser. Kanban board data in `localStorage` is not synced or transmitted anywhere. Settings in `chrome.storage.sync` are synced across your Chrome devices through your Google account — Chrome encrypts this data at rest.

### Permissions Used

| Permission | Justification |
|---|---|
| `storage` | Required for `chrome.storage.sync` (settings, bookmarks display, Yandex Disk OAuth token and Client ID, sync provider preference). Kanban board data uses `localStorage` and does not require this permission. |
| `identity` | Used solely for Google Drive OAuth (optional cloud sync). Authenticates you to your own Google Drive. |

### External Services (Optional)

#### Google Drive Sync
When enabled, your Kanban board data is uploaded to **your personal Google Drive** in a file named `kanban_data.json`. The extension uses the `drive.file` OAuth scope — it can only access files created by this extension itself. **We do not have access to your Google account or your other Drive files.**

#### Yandex Disk Sync
When enabled, your Kanban board data is uploaded to **your personal Yandex Disk** as `app:/kanban_data.json` (in the App folder). Your OAuth token is stored in `chrome.storage.sync`. **We do not have access to your Yandex account or your other files.**

#### Quotes Widget
The optional quotes widget fetches inspirational quotes from [ZenQuotes](https://zenquotes.io/) via the extension's background service worker (to bypass CORS restrictions) and, for non-English languages, translates them using Google Translate's public API (`translate.googleapis.com`). ZenQuotes does not require authentication. The extension sends only the quote text for translation — no personal data.

#### Weather Widget
The optional weather widget sends your configured city name to the [Open-Meteo](https://open-meteo.com/) geocoding and forecast APIs. Open-Meteo is a free, privacy-friendly service that does not require an API key and does not log requests.

If Open-Meteo is unreachable (network timeout or error), the widget falls back to [MET Norway](https://api.met.no/) and then to [7Timer](https://www.7timer.info/) as secondary weather providers. None of these services receive personal data — only coordinates derived from your city name.

#### Mini-Widgets (Coin, Pomodoro, Alarm/Timer)
The optional mini-widgets — Coin Flip, Pomodoro Timer, and Alarm Clock/Timer — operate entirely locally in your browser. **They do not make any network requests.** The alarm and pomodoro timer use the Web Audio API (in-browser sound synthesis) — no audio files are loaded or fetched. Toggle states and preferences for these widgets are stored in `chrome.storage.sync` for cross-device convenience.

#### Favicon Services
The extension loads favicon images for your bookmarks via Google's favicon service (`www.google.com/s2/favicons`), falling back to DuckDuckGo's favicon service (`icons.duckduckgo.com`). If both fail, a local SVG placeholder is shown.

### Bookmark Data
Bookmarks are added manually by the user via an inline form — the extension does not access the Chrome Bookmarks API. **We never send your bookmarks or URLs to any server.** The domain of each bookmark is sent to Google first, and only as a fallback to DuckDuckGo's favicon service to fetch its favicon.

## Data Sharing

**We do not collect, sell, or share any personal data.** We do not use analytics, tracking, or advertising networks. No data is sent to our own servers — the extension has no backend.

## Data Retention

- Board data remains in `localStorage` until you uninstall the extension or clear browser data.
- Settings in `chrome.storage.sync` persist as long as you are signed into Chrome.
- Google Drive / Yandex Disk files can be deleted manually by the user at any time.
- **When disabling cloud sync**: if your board contains more cards than localStorage quota allows, the oldest cards are **permanently lost** — only the newest cards that fit are kept. The user is warned before this happens and can cancel sign-out to preserve cloud data.

## Changes to This Policy

If this policy changes, we will update the "Last updated" date at the top. Continued use of the extension constitutes acceptance of any changes.

## Contact

For questions about this policy, open an issue at:
https://github.com/wolftik/tablo_kanban
