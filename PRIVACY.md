# Privacy Policy — Tablo Kanban

**Last updated:** May 6, 2026

## Overview

Tablo Kanban is a Chrome/Edge/Yandex extension that provides a bookmarks bar and a Kanban board, opened via the toolbar icon or set as a custom homepage. This policy explains what data the extension accesses, stores, and shares.

## Data Collection and Usage

### Data Stored Locally

| Data | Storage | Purpose |
|------|---------|---------|
| Kanban board (columns, cards, tags, performers, authors) | `localStorage` (with `kanban_` prefix) | Core functionality — your task board |
| Archived cards (older than 90 days) | `localStorage` (key `kanban_archive`) | Auto-archived cards, browsable and restorable |
| Settings (theme, language, widget preferences, bookmark slots) | `chrome.storage.sync` | Settings sync across your Chrome devices |
| Displayed bookmarks list | `chrome.storage.sync` | Which bookmarks you have placed on the board |
| Yandex Disk OAuth token | `chrome.storage.sync` | Optional cloud sync via Yandex Disk |

All data stays in your browser. Kanban board data in `localStorage` is not synced or transmitted anywhere. Settings in `chrome.storage.sync` are synced across your Chrome devices through your Google account — Chrome encrypts this data at rest.

### Permissions Used

| Permission | Justification |
|---|---|---|
| `storage` | Required for `chrome.storage.sync` (settings, bookmarks display, Yandex Disk OAuth token). Kanban board data uses `localStorage` and does not require this permission. |
| `identity` | Used solely for Google Drive OAuth (optional cloud sync). Authenticates you to your own Google Drive. |


### External Services (Optional)

#### Google Drive Sync
When enabled, your Kanban board data is uploaded to **your personal Google Drive** in a file named `kanban_data.json`. The extension uses the `drive.file` OAuth scope — it can only access files created by this extension itself. **We do not have access to your Google account or your other Drive files.**

#### Yandex Disk Sync
When enabled, your Kanban board data is uploaded to **your personal Yandex Disk** in the `app:/tablo_kanban/` folder. Your OAuth token is stored in `chrome.storage.sync`. **We do not have access to your Yandex account or your other files.**

#### Weather Widget (Open-Meteo)
The optional weather widget sends your configured city name to the [Open-Meteo](https://open-meteo.com/) geocoding and forecast APIs. Open-Meteo is a free, privacy-friendly service that does not require an API key and does not log requests.

#### Favicon Services
The extension loads favicon images for your bookmarks via DuckDuckGo's favicon service (`icons.duckduckgo.com`), falling back to Google's favicon service (`www.google.com/s2/favicons`). If both fail, a local SVG placeholder is shown.

### Bookmark Data
Bookmarks are added manually by the user via an inline form — the extension does not access the Chrome Bookmarks API. **We never send your bookmarks or URLs to any server.** The domain of each bookmark is sent to DuckDuckGo first, and only as a fallback to Google's favicon service to fetch its favicon.

## Data Sharing

**We do not collect, sell, or share any personal data.** We do not use analytics, tracking, or advertising networks. No data is sent to our own servers — the extension has no backend.

## Data Retention

- Board data remains in `localStorage` until you uninstall the extension or clear browser data.
- Archived cards remain in `localStorage` until manually deleted or cleared from the archive modal.
- Settings in `chrome.storage.sync` persist as long as you are signed into Chrome.
- Google Drive / Yandex Disk files can be deleted manually by the user at any time.

## Changes to This Policy

If this policy changes, we will update the "Last updated" date at the top. Continued use of the extension constitutes acceptance of any changes.

## Contact

For questions about this policy, open an issue at:
https://github.com/wolftik/tablo_kanban
