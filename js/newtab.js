'use strict';

moduleGuard('I18n');

document.addEventListener('DOMContentLoaded', async () => {
  await I18n.init();
  const settings = await StorageSync.get('settings') || getDefaultSettings();

  applyTheme(settings.theme || 'system');

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const theme = document.documentElement.getAttribute('data-theme');
    if (theme === 'system') applyTheme('system');
  });

  const bmContainer = document.getElementById('bookmarks-container');
  if (bmContainer) {
    BookmarksManager.render();
  }

  _initBookmarkModal();

  KanbanBoard.init();
  WidgetSystem.initAll();

  const widgetsZone = document.getElementById('widgets-zone');
  if (widgetsZone && bmContainer && !widgetsZone.classList.contains('active')) {
    bmContainer.classList.add('centered');
  }

  const settingsBtn = document.getElementById('settings-btn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      } else {
        window.open('options.html', '_blank');
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      const filterSearch = document.getElementById('filter-search');
      if (filterSearch) filterSearch.focus();
    }
    if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT')) return;
      e.preventDefault();
      const filterSearch = document.getElementById('filter-search');
      if (filterSearch) filterSearch.focus();
    }
    if (e.key === 'Escape') {
      BookmarksContextMenu.hide();
      const filterSearch = document.getElementById('filter-search');
      if (filterSearch && document.activeElement === filterSearch) {
        const filterClear = document.getElementById('filter-clear');
        if (filterClear && filterClear.classList.contains('visible')) {
          filterClear.click();
          filterSearch.blur();
        }
      }
    }
  });

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'sync' && changes.settings) {
        const newSettings = changes.settings.newValue;
        if (newSettings) {
          const oldTheme = document.documentElement.getAttribute('data-theme');
          const newTheme = newSettings.theme || 'system';
          if (newTheme !== oldTheme) applyTheme(newTheme);
          if (newSettings.language && ['ru', 'en', 'zh'].includes(newSettings.language) && newSettings.language !== I18n.getLang()) {
            location.reload();
            return;
          }
          BookmarksManager.render();
        }
      }
      if (areaName === 'sync' && changes.bookmarks_display) {
        BookmarksManager.render();
      }
      if (areaName === 'local' && changes.kanban_data) {
        KanbanBoard.init();
      }
    });
  }
});

function _initBookmarkModal() {
  const modal = document.getElementById('add-bookmark-modal');
  if (!modal) return;

  const urlInput = document.getElementById('bookmark-url');
  const titleInput = document.getElementById('bookmark-title');
  const saveBtn = document.getElementById('bookmark-save');
  const cancelBtn = document.getElementById('bookmark-cancel');

  cancelBtn.addEventListener('click', () => {
    modal.style.display = 'none';
    urlInput.value = '';
    titleInput.value = '';
    delete modal.dataset.targetIndex;
  });

  saveBtn.addEventListener('click', async () => {
    let url = urlInput.value.trim();
    const title = titleInput.value.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }

    let displayTitle = title;
    if (!displayTitle) {
      try {
        displayTitle = new URL(url).hostname;
      } catch {
        displayTitle = url;
      }
    }

    const targetIndex = modal.dataset.targetIndex ? parseInt(modal.dataset.targetIndex) : null;
    await BookmarksManager.addDisplayedBookmark(url, displayTitle, targetIndex);
    await BookmarksManager.render();
    modal.style.display = 'none';
    urlInput.value = '';
    titleInput.value = '';
    delete modal.dataset.targetIndex;

    const container = document.getElementById('bookmarks-container');
    if (container) {
      container.querySelectorAll('.bookmark-slot.empty.active').forEach(p => p.classList.remove('active'));
    }
  });

  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveBtn.click();
    if (e.key === 'Escape') cancelBtn.click();
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
      urlInput.value = '';
      titleInput.value = '';
      delete modal.dataset.targetIndex;
    }
  });
}


