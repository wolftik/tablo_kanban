'use strict';

moduleGuard('I18n');

document.addEventListener('DOMContentLoaded', async () => {
  await I18n.init();
  let settings = await StorageSync.get('settings') || getDefaultSettings();
  let tags = settings.tags || _getDefaultTags();
  let performers = settings.performers || _getDefaultPerformers();
  let authors = settings.authors || [];
  let columns = settings.columns || _getDefaultColumns();

  _setupTabs();

  function _setupTabs() {
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

  function _getDefaultTags() {
    return [
      { id: generateId(), name: 'Bug', color: '#ef4444' },
      { id: generateId(), name: 'Feature', color: '#3b82f6' },
      { id: generateId(), name: 'Enhancement', color: '#8b5cf6' }
    ];
  }

  function _getDefaultPerformers() {
    return [
      { id: generateId(), name: 'Иванов И.И.', color: '#6366f1' },
      { id: generateId(), name: 'Петров П.П.', color: '#22c55e' },
      { id: generateId(), name: 'Сидоров С.С.', color: '#f59e0b' }
    ];
  }

  function _getDefaultColumns() {
    return KanbanConstants.DEFAULT_COLUMNS.map((c, i) => ({
      id: generateId(),
      title: c.title,
      color: c.color,
      order: i,
      cards: []
    }));
  }

  // ===== Tags tab =====
  function renderTagsList() {
    const list = document.getElementById('tags-list');
    if (!list) return;
    list.innerHTML = '';

    tags.forEach(tag => {
      const item = document.createElement('div');
      item.className = 'column-option-item';

      const color = document.createElement('input');
      color.type = 'color';
      color.value = tag.color || '#6366f1';
      color.className = 'col-color-input';

      const name = document.createElement('input');
      name.type = 'text';
      name.value = tag.name;
      name.className = 'col-name-input';
      name.placeholder = I18n.t('options.tags.new');

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'col-delete-btn';
      deleteBtn.innerHTML = '&times;';
      deleteBtn.addEventListener('click', () => {
        tags = tags.filter(t => t.id !== tag.id);
        renderTagsList();
      });

      item.appendChild(color);
      item.appendChild(name);
      item.appendChild(deleteBtn);
      list.appendChild(item);

      const update = () => {
        const found = tags.find(t => t.id === tag.id);
        if (found) { found.name = name.value; found.color = color.value; }
      };
      name.addEventListener('blur', update);
      color.addEventListener('input', update);
    });
  }

  renderTagsList();

  document.getElementById('add-tag-option').addEventListener('click', () => {
    tags.push({
      id: generateId(),
      name: I18n.t('options.tags.new'),
      color: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')
    });
    renderTagsList();
  });

  // ===== Performers tab =====
  function renderPerformersList() {
    const list = document.getElementById('performers-list');
    if (!list) return;
    list.innerHTML = '';

    performers.forEach(performer => {
      const item = document.createElement('div');
      item.className = 'column-option-item';

      const color = document.createElement('input');
      color.type = 'color';
      color.value = performer.color || '#6366f1';
      color.className = 'col-color-input';

      const name = document.createElement('input');
      name.type = 'text';
      name.value = performer.name;
      name.className = 'col-name-input';
      name.placeholder = I18n.t('options.performers.new');

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'col-delete-btn';
      deleteBtn.innerHTML = '&times;';
      deleteBtn.addEventListener('click', () => {
        performers = performers.filter(p => p.id !== performer.id);
        renderPerformersList();
      });

      item.appendChild(color);
      item.appendChild(name);
      item.appendChild(deleteBtn);
      list.appendChild(item);

      const update = () => {
        const found = performers.find(p => p.id === performer.id);
        if (found) { found.name = name.value; found.color = color.value; }
      };
      name.addEventListener('blur', update);
      color.addEventListener('input', update);
    });
  }

  renderPerformersList();

  document.getElementById('add-performer-option').addEventListener('click', () => {
    performers.push({
      id: generateId(),
      name: I18n.t('options.performers.new'),
      color: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')
    });
    renderPerformersList();
  });

  // ===== Authors tab =====
  function renderAuthorsList() {
    const list = document.getElementById('authors-list');
    if (!list) return;
    list.innerHTML = '';

    authors.forEach(author => {
      const item = document.createElement('div');
      item.className = 'column-option-item';

      const name = document.createElement('input');
      name.type = 'text';
      name.value = author.name;
      name.className = 'col-name-input';
      name.placeholder = I18n.t('options.authors.new');

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'col-delete-btn';
      deleteBtn.innerHTML = '&times;';
      deleteBtn.addEventListener('click', () => {
        authors = authors.filter(a => a.id !== author.id);
        renderAuthorsList();
      });

      item.appendChild(name);
      item.appendChild(deleteBtn);
      list.appendChild(item);

      const update = () => {
        const found = authors.find(a => a.id === author.id);
        if (found) found.name = name.value;
      };
      name.addEventListener('blur', update);
    });
  }

  renderAuthorsList();

  document.getElementById('add-author-option').addEventListener('click', () => {
    authors.push({ id: generateId(), name: I18n.t('options.authors.new') });
    renderAuthorsList();
  });

  // ===== Columns tab =====
  function renderColumnsList() {
    const list = document.getElementById('columns-list');
    if (!list) return;
    list.innerHTML = '';

    const sorted = [...columns].sort((a, b) => (a.order || 0) - (b.order || 0));

    sorted.forEach(col => {
      const item = document.createElement('div');
      item.className = 'column-option-item';
      item.dataset.columnId = col.id;
      item.draggable = true;

      const dragHandle = document.createElement('span');
      dragHandle.className = 'col-drag-handle';
      dragHandle.textContent = '\u2630';

      const color = document.createElement('input');
      color.type = 'color';
      color.value = col.color || '#6366f1';
      color.className = 'col-color-input';

      const name = document.createElement('input');
      name.type = 'text';
      name.value = col.title;
      name.className = 'col-name-input';
      name.placeholder = I18n.t('options.columns.new');

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'col-delete-btn';
      deleteBtn.innerHTML = '&times;';
      deleteBtn.addEventListener('click', () => {
        if (columns.length <= 1) return;
        const confirmMsg = I18n.t('column.delete.confirm', { title: escapeHtml(col.title) });
        if (!confirm(confirmMsg)) return;
        columns = columns.filter(c => c.id !== col.id);
        renderColumnsList();
      });

      item.appendChild(dragHandle);
      item.appendChild(color);
      item.appendChild(name);
      item.appendChild(deleteBtn);
      list.appendChild(item);

      const update = () => {
        const found = columns.find(c => c.id === col.id);
        if (found) { found.title = name.value; found.color = color.value; }
      };
      name.addEventListener('blur', update);
      color.addEventListener('input', update);

      item.addEventListener('dragstart', (e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', col.id);
        item.classList.add('dragging');
      });

      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        document.querySelectorAll('.column-option-item.drag-over').forEach(el => el.classList.remove('drag-over'));
      });
    });

    _bindColumnDragDrop(list);
  }

  function _bindColumnDragDrop(list) {
    let dragId = null;

    list.addEventListener('dragstart', (e) => {
      const item = e.target.closest('.column-option-item');
      if (!item) return;
      dragId = item.dataset.columnId;
    });

    list.addEventListener('dragover', (e) => {
      e.preventDefault();
      const afterElement = getDragAfterElement(list, e.clientY);
      const dragging = list.querySelector('.dragging');
      if (!dragging) return;
      if (afterElement == null) {
        list.appendChild(dragging);
      } else {
        list.insertBefore(dragging, afterElement);
      }
    });

    list.addEventListener('drop', () => {
      if (!dragId) return;
      const items = [...list.querySelectorAll('.column-option-item')];
      const orderedIds = items.map(el => el.dataset.columnId);
      const newColumns = [];
      orderedIds.forEach((id, idx) => {
        const col = columns.find(c => c.id === id);
        if (col) {
          col.order = idx;
          newColumns.push(col);
        }
      });
      columns = newColumns;
      dragId = null;
    });
  }

  renderColumnsList();

  document.getElementById('add-column-option').addEventListener('click', () => {
    columns.push({
      id: generateId(),
      title: I18n.t('options.columns.new'),
      color: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
      order: columns.length,
      cards: []
    });
    renderColumnsList();
  });

  // ===== Appearance tab =====
  function loadSettingsUI() {
    const theme = settings.theme || 'system';
    document.querySelectorAll('input[name="theme"]').forEach(radio => {
      radio.checked = radio.value === theme;
    });
    const langSelect = document.getElementById('language-select');
    if (langSelect) {
      langSelect.value = settings.language || 'ru';
    }
  }

  loadSettingsUI();
  applyTheme(settings.theme);

  // ===== Save =====
  document.getElementById('save-options').addEventListener('click', async () => {
    const theme = document.querySelector('input[name="theme"]:checked')?.value || 'system';

    const language = document.getElementById('language-select')?.value || 'ru';

    settings = {
      theme,
      language,
      tags,
      columns,
      performers,
      authors,
      visibleBookmarks: settings.visibleBookmarks || [],
      showFavicon: settings.showFavicon !== undefined ? settings.showFavicon : true,
      kanbanFilter: settings.kanbanFilter || {}
    };

    await StorageSync.set('settings', settings);
    applyTheme(theme);
    I18n.setLang(language);

    const btn = document.getElementById('save-options');
    const originalText = btn.textContent;
    btn.textContent = I18n.t('options.saved');
    btn.disabled = true;
    setTimeout(() => {
      btn.textContent = originalText;
      btn.disabled = false;
    }, 1500);
  });
});
