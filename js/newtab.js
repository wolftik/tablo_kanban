'use strict';

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
    await BookmarksManager.render();
  }

  _initBookmarkModal();

  KanbanBoard.init();
  // Sync no-widgets class after widget init (also synced in bookmarks.js _updateResponsiveLayout)
  WidgetSystem.initAll().then(() => {
    const headBar = document.getElementById('head-bar');
    const zone = document.getElementById('widgets-zone');
    if (headBar && headBar.classList.contains('no-bookmarks')) {
      headBar.classList.toggle('no-widgets', !(zone && zone.classList.contains('active')));
    }
  });

  // centered class on bookmarks-container always added in BookmarksManager._renderBookmarks()

  const settingsBtn = document.getElementById('settings-btn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      window.location.href = 'options.html';
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

  // Homepage info modal
  const infoBtn = document.getElementById('homepage-info-btn');
  const modal = document.getElementById('homepage-modal');
  const urlInput = document.getElementById('homepage-url-input');
  const copyBtn = document.getElementById('homepage-copy-btn');
  const closeBtn = document.getElementById('homepage-modal-close');

  if (infoBtn && modal) {
    infoBtn.addEventListener('click', () => {
      if (urlInput) urlInput.value = window.location.href;
      modal.style.display = 'flex';
    });
  }

  if (copyBtn && urlInput) {
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(urlInput.value);
        const orig = copyBtn.textContent;
        copyBtn.textContent = I18n.t('homepage.modal.copied');
        setTimeout(() => { copyBtn.textContent = orig; }, 2000);
      } catch (e) { console.error(e); }
    });
  }

  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => { modal.style.display = 'none'; });
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
  }

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'sync' && changes.settings) {
        const newSettings = changes.settings.newValue;
        if (newSettings) {
          const oldTheme = document.documentElement.getAttribute('data-theme');
          const newTheme = newSettings.theme || 'system';
          if (newTheme !== oldTheme) applyTheme(newTheme);
          if (newSettings.language && newSettings.language !== I18n.getLang()) {
            location.reload();
            return;
          }
          const zone = document.getElementById('widgets-zone');
          if (zone) {
            zone.innerHTML = '';
            zone.classList.remove('active');
            delete zone.dataset.enabled;
            WidgetSystem.destroyAll();
          }
          WidgetSystem.register('quotes', QuotesWidget);
          WidgetSystem.register('weather', WeatherWidget);
          WidgetSystem.register('clock', ClockWidget);
          WidgetSystem.register('coin', CoinWidget);
          WidgetSystem.register('pomodoro', PomodoroWidget);
          if (typeof EightBallWidget !== 'undefined') WidgetSystem.register('8ball', EightBallWidget);
          WidgetSystem.register('alarmtimer', AlarmTimerWidget);
          WidgetSystem.initAll();
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
  const addModal = document.getElementById('add-bookmark-modal');
  if (!addModal) return;

  const addUrlInput = document.getElementById('bookmark-url');
  const addTitleInput = document.getElementById('bookmark-title');
  const addSaveBtn = document.getElementById('bookmark-save');
  const addCancelBtn = document.getElementById('bookmark-cancel');

  addCancelBtn.addEventListener('click', () => {
    addModal.style.display = 'none';
    addUrlInput.value = '';
    addTitleInput.value = '';
    delete addModal.dataset.targetIndex;
  });

  addSaveBtn.addEventListener('click', async () => {
    let url = addUrlInput.value.trim();
    const title = addTitleInput.value.trim();
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

    const targetIndex = addModal.dataset.targetIndex ? parseInt(addModal.dataset.targetIndex) : null;
    await BookmarksManager.addDisplayedBookmark(url, displayTitle, targetIndex);
    await BookmarksManager.render();
    addModal.style.display = 'none';
    addUrlInput.value = '';
    addTitleInput.value = '';
    delete addModal.dataset.targetIndex;

    const container = document.getElementById('bookmarks-container');
    if (container) {
      container.querySelectorAll('.bookmark-slot.empty.active').forEach(p => p.classList.remove('active'));
    }
  });

  addUrlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addSaveBtn.click();
    if (e.key === 'Escape') addCancelBtn.click();
  });

  addModal.addEventListener('mousedown', (e) => {
    if (e.target === addModal) {
      addModal.style.display = 'none';
      addUrlInput.value = '';
      addTitleInput.value = '';
      delete addModal.dataset.targetIndex;
    }
  });

  _initBookmarkEditModal();
}

function _initBookmarkEditModal() {
  if (document.getElementById('bookmark-edit-modal')) return;
  let editModal = document.createElement('div');
  editModal.id = 'bookmark-edit-modal';
  editModal.className = 'modal-overlay';
  editModal.style.display = 'none';
  editModal.innerHTML = `
    <div class="modal">
      <h3 data-i18n="bookmark.edit.title"></h3>
      <input type="text" id="bookmark-edit-url" data-i18n-placeholder="bookmark.edit.url.placeholder">
      <input type="text" id="bookmark-edit-title" data-i18n-placeholder="bookmark.edit.title.placeholder">
      <div class="modal-actions">
        <button id="bookmark-edit-cancel" data-i18n="bookmark.cancel"></button>
        <button id="bookmark-edit-save" data-i18n="bookmark.save"></button>
      </div>
    </div>
  `;
  document.body.appendChild(editModal);

  editModal.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = I18n.t(el.dataset.i18n);
  });
  editModal.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = I18n.t(el.dataset.i18nPlaceholder);
  });

  const urlInput = document.getElementById('bookmark-edit-url');
  const titleInput = document.getElementById('bookmark-edit-title');
  const saveBtn = document.getElementById('bookmark-edit-save');
  const cancelBtn = document.getElementById('bookmark-edit-cancel');

  if (!urlInput || !titleInput || !saveBtn || !cancelBtn) return;

  cancelBtn.addEventListener('click', () => { editModal.style.display = 'none'; });
  saveBtn.addEventListener('click', async () => {
    const newUrl = urlInput.value.trim();
    const newTitle = titleInput.value.trim();
    // TODO: use BookmarksManager._editingBookmark instead of editModal._currentBookmark
    const bookmark = editModal._currentBookmark;
    if (!newUrl || !bookmark) return;

    const index = editModal._displayedBookmarks.findIndex(b => b && b.id === bookmark.id);
    if (index === -1) return;

    editModal._displayedBookmarks[index] = { ...editModal._displayedBookmarks[index], url: newUrl, title: newTitle || newUrl };
    await BookmarksManager.saveDisplayedBookmarks(editModal._displayedBookmarks);
    await BookmarksManager.render();
    editModal.style.display = 'none';
  });

  editModal.addEventListener('mousedown', (e) => {
    if (e.target === editModal) editModal.style.display = 'none';
  });
}


