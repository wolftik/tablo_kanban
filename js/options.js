document.addEventListener('DOMContentLoaded', async () => {
  let settings = await Storage.get('settings') || Storage.getDefaultSettings();
  let columns = settings.columns || Storage.getDefaultColumns();
  let bookmarkFolders = [];

  await loadChromeBookmarks();

  setupTabs();
  renderColumnsList();
  renderBookmarkFolders();
  loadSettingsUI();

  async function loadChromeBookmarks() {
    return new Promise((resolve) => {
      if (typeof chrome === 'undefined' || !chrome.bookmarks) {
        resolve([]);
        return;
      }
      chrome.bookmarks.getTree((result) => {
        bookmarkFolders = flattenFolders(result, []);
        resolve(bookmarkFolders);
      });
    });
  }

  function flattenFolders(nodes, result) {
    for (const node of nodes) {
      if (!node.url && node.title) {
        result.push({ id: node.id, title: node.title || 'Без названия' });
      }
      if (node.children) {
        flattenFolders(node.children, result);
      }
    }
    return result;
  }

  function setupTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        contents.forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        const tabId = tab.dataset.tab;
        document.getElementById('tab-' + tabId).classList.add('active');
      });
    });
  }

  function renderColumnsList() {
    const list = document.getElementById('columns-list');
    if (!list) return;

    list.innerHTML = '';

    const sorted = [...columns].sort((a, b) => (a.order || 0) - (b.order || 0));

    sorted.forEach((col, index) => {
      const item = document.createElement('div');
      item.className = 'column-option-item';
      item.draggable = true;
      item.dataset.columnId = col.id;

      const dragHandle = document.createElement('span');
      dragHandle.className = 'col-drag-handle';
      dragHandle.textContent = '&#9776;';

      const color = document.createElement('input');
      color.type = 'color';
      color.value = col.color || '#6366f1';
      color.className = 'col-color';

      const name = document.createElement('input');
      name.type = 'text';
      name.value = col.title;
      name.className = 'col-name';

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'col-delete-btn';
      deleteBtn.innerHTML = '&times;';
      deleteBtn.addEventListener('click', () => {
        if (columns.length <= 1) return;
        columns = columns.filter(c => c.id !== col.id);
        renderColumnsList();
      });

      item.appendChild(dragHandle);
      item.appendChild(color);
      item.appendChild(name);
      item.appendChild(deleteBtn);
      list.appendChild(item);

      const updateColumn = () => {
        const found = columns.find(c => c.id === col.id);
        if (found) {
          found.title = name.value;
          found.color = color.value;
        }
      };

      name.addEventListener('blur', updateColumn);
      color.addEventListener('input', updateColumn);
    });

    setupColumnReorder(list);
  }

  function setupColumnReorder(list) {
    let draggedItem = null;

    list.addEventListener('dragstart', (e) => {
      const item = e.target.closest('.column-option-item');
      if (!item) return;
      draggedItem = item;
      item.style.opacity = '0.5';
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', item.dataset.columnId);
    });

    list.addEventListener('dragend', (e) => {
      if (draggedItem) draggedItem.style.opacity = '1';
      draggedItem = null;
      list.querySelectorAll('.column-option-item').forEach(i => {
        i.style.borderTop = '';
      });
    });

    list.addEventListener('dragover', (e) => {
      e.preventDefault();
      const afterElement = getDragAfterElement(list, e.clientY);
      if (draggedItem) {
        if (afterElement == null) {
          list.appendChild(draggedItem);
        } else {
          list.insertBefore(draggedItem, afterElement);
        }
      }
    });

    list.addEventListener('drop', (e) => {
      e.preventDefault();
      const newOrder = [...list.querySelectorAll('.column-option-item')];
      const newColumns = [];
      for (const el of newOrder) {
        const col = columns.find(c => c.id === el.dataset.columnId);
        if (col) newColumns.push(col);
      }
      columns = newColumns;
      renderColumnsList();
    });
  }

  

  function renderBookmarkFolders() {
    const list = document.getElementById('bookmark-folders-list');
    if (!list) return;

    list.innerHTML = '';

    if (bookmarkFolders.length === 0) {
      const empty = document.createElement('p');
      empty.style.color = 'var(--text-secondary)';
      empty.textContent = 'Нет доступных папок закладок';
      list.appendChild(empty);
      return;
    }

    const visibleIds = settings.visibleBookmarks || [];

    for (const folder of bookmarkFolders) {
      const item = document.createElement('div');
      item.className = 'folder-check-item';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = visibleIds.includes(folder.id);
      checkbox.dataset.folderId = folder.id;

      const icon = document.createElement('span');
      icon.className = 'folder-icon';
      icon.textContent = '&#128193;';

      const name = document.createElement('span');
      name.className = 'folder-name';
      name.textContent = folder.title;

      item.appendChild(checkbox);
      item.appendChild(icon);
      item.appendChild(name);
      list.appendChild(item);
    }
  }

  function loadSettingsUI() {
    const theme = settings.theme || 'system';
    const cardSize = settings.cardSize || 'standard';
    const showFavicon = settings.showFavicon !== false;

    document.querySelectorAll('input[name="theme"]').forEach(radio => {
      radio.checked = radio.value === theme;
    });

    document.querySelectorAll('input[name="card-size"]').forEach(radio => {
      radio.checked = radio.value === cardSize;
    });

    const faviconCheckbox = document.getElementById('show-favicon-option');
    if (faviconCheckbox) {
      faviconCheckbox.checked = showFavicon;
    }
  }

  document.getElementById('add-column-option').addEventListener('click', () => {
    columns.push({
      id: Storage.generateId(),
      title: 'Новая колонка',
      color: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
      order: columns.length,
      cards: []
    });
    renderColumnsList();
  });

  document.getElementById('save-options').addEventListener('click', async () => {
    const theme = document.querySelector('input[name="theme"]:checked')?.value || 'system';
    const cardSize = document.querySelector('input[name="card-size"]:checked')?.value || 'standard';
    const showFaviconEl = document.getElementById('show-favicon-option');
    const showFavicon = showFaviconEl ? !!showFaviconEl.checked : true;

    const visibleIds = [];
    document.querySelectorAll('#bookmark-folders-list input[type="checkbox"]:checked').forEach(cb => {
      visibleIds.push(cb.dataset.folderId);
    });

    columns.forEach((col, i) => { col.order = i; });

    settings = {
      theme: theme,
      cardSize: cardSize,
      showFavicon: showFavicon,
      visibleBookmarks: visibleIds,
      columns: columns
    };

    await Storage.set('settings', settings);

    const btn = document.getElementById('save-options');
    const originalText = btn.textContent;
    btn.textContent = 'Сохранено!';
    btn.disabled = true;
    setTimeout(() => {
      btn.textContent = originalText;
      btn.disabled = false;
    }, 1500);
  });
});
