'use strict';

document.addEventListener('DOMContentLoaded', async () => {
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


