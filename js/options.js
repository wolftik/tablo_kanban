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
    return KanbanConstants.DEFAULT_TAGS.map(t => ({ ...t, id: generateId() }));
  }

  function _getDefaultPerformers() {
    return KanbanConstants.DEFAULT_PERFORMERS.map(p => ({ ...p, id: generateId() }));
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

  function _renderColoredList(listId, items, { placeholderKey, onDelete, onUpdate }) {
    const list = document.getElementById(listId);
    if (!list) return;
    list.innerHTML = '';

    items.forEach(item => {
      const el = document.createElement('div');
      el.className = 'column-option-item';

      const colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.value = item.color || '#6366f1';
      colorInput.className = 'col-color-input';

      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.value = item.name;
      nameInput.className = 'col-name-input';
      nameInput.placeholder = I18n.t(placeholderKey);

      const delBtn = document.createElement('button');
      delBtn.className = 'col-delete-btn';
      delBtn.innerHTML = '&times;';
      delBtn.addEventListener('click', () => {
        onDelete(item.id);
      });

      el.appendChild(colorInput);
      el.appendChild(nameInput);
      el.appendChild(delBtn);
      list.appendChild(el);

      const sync = () => onUpdate(item.id, nameInput.value, colorInput.value);
      nameInput.addEventListener('blur', sync);
      colorInput.addEventListener('input', sync);
    });
  }

  function _renderTextList(listId, items, { placeholderKey, onDelete, onUpdate }) {
    const list = document.getElementById(listId);
    if (!list) return;
    list.innerHTML = '';

    items.forEach(item => {
      const el = document.createElement('div');
      el.className = 'column-option-item';

      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.value = item.name;
      nameInput.className = 'col-name-input';
      nameInput.placeholder = I18n.t(placeholderKey);

      const delBtn = document.createElement('button');
      delBtn.className = 'col-delete-btn';
      delBtn.innerHTML = '&times;';
      delBtn.addEventListener('click', () => {
        onDelete(item.id);
      });

      el.appendChild(nameInput);
      el.appendChild(delBtn);
      list.appendChild(el);

      const sync = () => onUpdate(item.id, nameInput.value);
      nameInput.addEventListener('blur', sync);
    });
  }

  function _randomColor() {
    return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
  }

  // ===== Tags tab =====
  function renderTagsList() {
    _renderColoredList('tags-list', tags, {
      placeholderKey: 'options.tags.new',
      onDelete: (id) => { tags = tags.filter(t => t.id !== id); renderTagsList(); },
      onUpdate: (id, name, color) => { const f = tags.find(t => t.id === id); if (f) { f.name = name; f.color = color; } }
    });
  }

  renderTagsList();

  document.getElementById('add-tag-option').addEventListener('click', () => {
    tags.push({ id: generateId(), name: I18n.t('options.tags.new'), color: _randomColor() });
    renderTagsList();
  });

  // ===== Performers tab =====
  function renderPerformersList() {
    _renderColoredList('performers-list', performers, {
      placeholderKey: 'options.performers.new',
      onDelete: (id) => { performers = performers.filter(p => p.id !== id); renderPerformersList(); },
      onUpdate: (id, name, color) => { const f = performers.find(p => p.id === id); if (f) { f.name = name; f.color = color; } }
    });
  }

  renderPerformersList();

  document.getElementById('add-performer-option').addEventListener('click', () => {
    performers.push({ id: generateId(), name: I18n.t('options.performers.new'), color: _randomColor() });
    renderPerformersList();
  });

  // ===== Authors tab =====
  function renderAuthorsList() {
    _renderTextList('authors-list', authors, {
      placeholderKey: 'options.authors.new',
      onDelete: (id) => { authors = authors.filter(a => a.id !== id); renderAuthorsList(); },
      onUpdate: (id, name) => { const f = authors.find(a => a.id === id); if (f) f.name = name; }
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
        dragId = null;
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
      const afterElement = getDragAfterElement(list, e.clientY, '.column-option-item:not(.dragging)');
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
    if ($langSelect) {
      $langSelect.value = settings.language || 'ru';
    }
    if ($clockChk) {
      $clockChk.checked = settings.widgets?.clock !== false;
    }
    const weatherSettings = document.getElementById('weather-settings');
    if ($weatherChk && weatherSettings) {
      $weatherChk.checked = settings.widgets?.weather === true;
      weatherSettings.style.display = $weatherChk.checked ? 'block' : 'none';
      $weatherChk.addEventListener('change', () => {
        weatherSettings.style.display = $weatherChk.checked ? 'block' : 'none';
      });
    }
    if ($weatherCity) {
      $weatherCity.value = settings.widgets?.weatherCity || 'Moscow';
    }
    if ($weatherUnit) {
      $weatherUnit.value = settings.widgets?.weatherUnit || 'metric';
    }
  }

  // ===== Save =====
  const $saveBtn = document.getElementById('save-options');
  const $langSelect = document.getElementById('language-select');
  const $clockChk = document.getElementById('widget-clock');
  const $weatherChk = document.getElementById('widget-weather');
  const $weatherCity = document.getElementById('weather-city');
  const $weatherUnit = document.getElementById('weather-unit');

  loadSettingsUI();
  applyTheme(settings.theme);

  $saveBtn.addEventListener('click', async () => {
    const theme = document.querySelector('input[name="theme"]:checked')?.value || 'system';
    const language = $langSelect?.value || 'ru';

    settings = {
      theme,
      language,
      tags,
      columns,
      performers,
      authors,
      visibleBookmarks: settings.visibleBookmarks || [],
      showFavicon: settings.showFavicon !== undefined ? settings.showFavicon : true,
      kanbanFilter: settings.kanbanFilter || {},
      widgets: {
        clock: $clockChk ? $clockChk.checked : true,
        weather: $weatherChk ? $weatherChk.checked : false,
        weatherCity: $weatherCity ? $weatherCity.value.trim() || 'Moscow' : 'Moscow',
        weatherUnit: $weatherUnit ? $weatherUnit.value : 'metric'
      }
    };

    await StorageSync.set('settings', settings);
    applyTheme(theme);
    I18n.setLang(language);

    const originalText = $saveBtn.textContent;
    $saveBtn.textContent = I18n.t('options.saved');
    $saveBtn.disabled = true;
    setTimeout(() => {
      $saveBtn.textContent = originalText;
      $saveBtn.disabled = false;
    }, 1500);
  });
});
