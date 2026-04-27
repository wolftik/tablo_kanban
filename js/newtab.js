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

  if (addBmBtn && addBmModal) {
    addBmBtn.addEventListener('click', () => {
      addBmModal.style.display = 'flex';
      bmUrlInput.focus();
    });

    bmCancelBtn.addEventListener('click', () => {
      addBmModal.style.display = 'none';
      bmUrlInput.value = '';
      bmTitleInput.value = '';
    });

    bmSaveBtn.addEventListener('click', async () => {
      let url = bmUrlInput.value.trim();
      const title = bmTitleInput.value.trim();
      if (!url) return;
      if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
      }
      await BookmarksManager.addDisplayedBookmark(url, title || new URL(url).hostname);
      await BookmarksManager.render();
      addBmModal.style.display = 'none';
      bmUrlInput.value = '';
      bmTitleInput.value = '';
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
      }
    });
  }

  await KanbanBoard.init();
});

function applyTheme(theme) {
  if (!theme || theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
}
