# Privacy Policy — Tablo Kanban

**Last updated:** May 6, 2026

## Overview

Tablo Kanban is a Chrome/Edge/Yandex extension that replaces the new tab page with a bookmarks bar and a Kanban board. This policy explains what data the extension accesses, stores, and shares.

## Data Collection and Usage

### Data Stored Locally

| Data | Storage | Purpose |
|------|---------|---------|
| Kanban board (columns, cards, tags, performers, authors) | `chrome.storage.local` | Core functionality — your task board |
| Settings (theme, language, widget preferences, bookmark slots) | `chrome.storage.sync` | Settings sync across your Chrome devices |
| Displayed bookmarks list | `chrome.storage.sync` | Which bookmarks you have placed on the board |
| Yandex Disk OAuth token | `chrome.storage.sync` | Optional cloud sync via Yandex Disk |

All data stored via `chrome.storage` is **encrypted at rest** by Chrome and is never sent to our servers.

### Permissions Used

| Permission | Justification |
|---|---|---|
| `storage` | Required for `chrome.storage.sync` and `chrome.storage.local` to save your board data and settings. |
| `identity` | Used solely for Google Drive OAuth (optional cloud sync). Authenticates you to your own Google Drive. |
| `tabs` | Used to open the extension page when the extension icon is clicked. |

### External Services (Optional)

#### Google Drive Sync
When enabled, your Kanban board data is uploaded to **your personal Google Drive** in a file named `kanban_data.json`. The extension uses the `drive.file` OAuth scope — it can only access files created by this extension itself. **We do not have access to your Google account or your other Drive files.**

#### Yandex Disk Sync
When enabled, your Kanban board data is uploaded to **your personal Yandex Disk** in the `app:/tablo_kanban/` folder. Your OAuth token is stored in `chrome.storage.sync`. **We do not have access to your Yandex account or your other files.**

#### Weather Widget (Open-Meteo)
The optional weather widget sends your configured city name to the [Open-Meteo](https://open-meteo.com/) geocoding and forecast APIs. Open-Meteo is a free, privacy-friendly service that does not require an API key and does not log requests.

#### Favicon Service (Google)
The extension loads favicon images from `www.google.com/s2/favicons` based on the domain names of your bookmarks.

### Bookmark Data
The extension reads your Chrome bookmarks only to let you display them on the new tab page. **We never send your bookmarks or URLs to any server.** The favicon request sends only the domain to Google's public favicon service.

## Data Sharing

**We do not collect, sell, or share any personal data.** We do not use analytics, tracking, or advertising networks. No data is sent to our own servers — the extension has no backend.

## Data Retention

- Board data remains in `chrome.storage.local` until you uninstall the extension or clear browser data.
- Settings in `chrome.storage.sync` persist as long as you are signed into Chrome.
- Google Drive / Yandex Disk files can be deleted manually by the user at any time.

## Changes to This Policy

If this policy changes, we will update the "Last updated" date at the top. Continued use of the extension constitutes acceptance of any changes.

## Contact

For questions about this policy, open an issue at:
https://github.com/wolftik/tablo_kanban
