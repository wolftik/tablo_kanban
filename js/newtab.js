document.addEventListener('DOMContentLoaded', async () => {
  const settings = await Storage.get('settings') || Storage.getDefaultSettings();

  applyTheme(settings.theme || 'system');

  const bmContainer = document.getElementById('bookmarks-container');
  if (bmContainer) {
    await BookmarksManager.render();
  }

  const addBmBtn = document.getElementById('add-bookmark-btn');
  const addBmModal = document.getElementById('add-bookmark-modal');
  const bmUrlInput = document.getElementById('bookmark-url');
  const bmTitleInput = document.getElementById('bookmark-title');
  const bmSaveBtn = document.getElementById('bookmark-save');
  const bmCancelBtn = document.getElementById('bookmark-cancel');

  // Modal event bindings (always execute)
  if (addBmModal) {
    // Only bind the "add via button" if the button exists
    if (addBmBtn) {
      addBmBtn.addEventListener('click', () => {
        const container = document.getElementById('bookmarks-container');
        if (container) {
          container.querySelectorAll('.bookmark-slot.empty.active').forEach(p => p.classList.remove('active'));
        }
        // Сбросить позицию
        delete addBmModal.dataset.targetIndex;
        addBmModal.style.display = 'flex';
        bmUrlInput.focus();
      });
    }

    bmCancelBtn.addEventListener('click', () => {
      addBmModal.style.display = 'none';
      bmUrlInput.value = '';
      bmTitleInput.value = '';
      delete addBmModal.dataset.targetIndex;
    });

    bmSaveBtn.addEventListener('click', async () => {
      let url = bmUrlInput.value.trim();
      const title = bmTitleInput.value.trim();
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
      
      const targetIndex = addBmModal.dataset.targetIndex ? parseInt(addBmModal.dataset.targetIndex) : null;
          await BookmarksManager.addDisplayedBookmark(url, displayTitle, targetIndex);
      await BookmarksManager.render();
      addBmModal.style.display = 'none';
      bmUrlInput.value = '';
      bmTitleInput.value = '';
      delete addBmModal.dataset.targetIndex;
      
      // Убрать активный класс у всех плейсхолдеров
      const container = document.getElementById('bookmarks-container');
      if (container) {
        container.querySelectorAll('.bookmark-slot.empty.active').forEach(p => p.classList.remove('active'));
      }
    });

    bmUrlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') bmSaveBtn.click();
      if (e.key === 'Escape') bmCancelBtn.click();
    });

    addBmModal.addEventListener('click', (e) => {
      if (e.target === addBmModal) {
        addBmModal.style.display = 'none';
        bmUrlInput.value = '';
        bmTitleInput.value = '';
        delete addBmModal.dataset.targetIndex;
      }
    });
  }

  await KanbanBoard.init();

  // Settings button — opens options page
  const settingsBtn = document.getElementById('settings-btn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      } else {
        window.open('views/options.html', '_blank');
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
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT')) {
        return;
      }
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

function applyTheme(theme) {
  if (!theme || theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
}
