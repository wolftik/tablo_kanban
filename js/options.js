'use strict';

document.addEventListener('DOMContentLoaded', async () => {
  await I18n.init();
  let settings = await StorageSync.get('settings') || getDefaultSettings();
  let kanbanData = await StorageLocal.get(KanbanConstants.STORAGE_KEY) || {};
  KanbanStore.loadData(kanbanData);
  let tags = kanbanData.tags || _getDefaultTags();
  let performers = kanbanData.performers || _getDefaultPerformers();
  let authors = kanbanData.authors || [];
  let columns = kanbanData.columns || _getDefaultColumns();

  _setupTabs();

  function _setVersion() {
    const verEl = document.querySelector('[data-i18n="options.about.version"]');
    if (verEl && typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) {
      const manifest = chrome.runtime.getManifest();
      verEl.textContent = verEl.textContent.replace('{version}', manifest.version || '?');
    }
  }
  _setVersion();

  async function _updateStorageUsage() {
    const el = document.getElementById('storage-usage');
    const section = document.getElementById('local-storage-section');
    if (!el || !section) return;
    const mode = await StorageManager.getMode();
    if (mode === 'cloud') {
      section.style.display = 'none';
      return;
    }
    section.style.display = '';
    try {
      const info = StorageManager.getStorageInfo();
      const pct = ((info.used / info.quota) * 100);
      const pctStr = pct.toFixed(1);
      const usedKB = (info.used / 1024).toFixed(1);
      const totalKB = (info.quota / 1024).toFixed(0);
      const pct90 = pct >= 90;
      el.innerHTML = '<span class="setting-hint' + (pct90 ? ' storage-warning' : '') + '"' + (pct90 ? ' title="' + I18n.t('storage.warning.full') + '"' : '') + '>' + I18n.t('options.storage.usage', { used: usedKB, total: totalKB, pct: pctStr }) + '</span>';
      if (pct90) el.classList.add('storage-warning-bg');
      else el.classList.remove('storage-warning-bg');
    } catch {
      el.innerHTML = '';
    }
  }

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

      const isFirst = KanbanStore.isFirstColumn(col.id);

      const dragHandle = document.createElement('span');
      dragHandle.className = 'col-drag-handle';
      dragHandle.textContent = '\u2630';
      if (isFirst) dragHandle.style.display = 'none';

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
      if (isFirst) {
        deleteBtn.style.display = 'none';
      } else {
        deleteBtn.addEventListener('click', () => {
          if (columns.length <= 1) return;
          const confirmMsg = I18n.t('column.delete.confirm', { title: escapeHtml(col.title) });
          if (!confirm(confirmMsg)) return;
          columns = columns.filter(c => c.id !== col.id);
          renderColumnsList();
        });
      }

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
      if (KanbanStore.isFirstColumn(item.dataset.columnId)) {
        e.preventDefault();
        return;
      }
      dragId = item.dataset.columnId;
    });

    list.addEventListener('dragover', (e) => {
      e.preventDefault();
      const dragging = list.querySelector('.dragging');
      if (!dragging) return;
      if (KanbanStore.isFirstColumn(dragging.dataset.columnId)) return;
      const afterElement = getDragAfterElement(list, e.clientY, '.column-option-item:not(.dragging)');
      if (afterElement == null || KanbanStore.isFirstColumn(afterElement.dataset.columnId)) {
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
      const firstColIdx = newColumns.findIndex(c => KanbanStore.isFirstColumn(c.id));
      if (firstColIdx > 0) {
        const firstCol = newColumns.splice(firstColIdx, 1)[0];
        newColumns.unshift(firstCol);
      }
      newColumns.forEach((c, i) => { c.order = i; });
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
      $langSelect.value = settings.language || 'en';
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
    const $bookmarkSlots = document.getElementById('bookmark-slots');
    if ($bookmarkSlots) {
      $bookmarkSlots.value = settings.bookmarkSlots || 22;
      $bookmarkSlots.addEventListener('change', () => {
        let val = parseInt($bookmarkSlots.value) || 22;
        if (val % 2 !== 0) val = Math.min(val + 1, 22);
        if (val < 2) val = 2;
        if (val > 22) val = 22;
        $bookmarkSlots.value = val;
      });
    }
  }

  // ===== Sync tab =====
  (async function _initSyncTab() {
    const statusText = document.getElementById('sync-status-text');
    const signInBtn = document.getElementById('sync-sign-in');
    const signOutBtn = document.getElementById('sync-sign-out');
    const providerSelect = document.getElementById('sync-provider-select');
    const providerDesc = document.getElementById('sync-provider-desc');
    const tokenSection = document.getElementById('yadisk-token-section');
    const clientSection = document.getElementById('yadisk-client-section');
    const clientInput = document.getElementById('yadisk-client-input');
    const clientApply = document.getElementById('yadisk-client-apply');
    const oauthBtn = document.getElementById('yadisk-oauth-btn');
    const tokenSectionInner = document.getElementById('yadisk-token-section-inner');
    const tokenInput = document.getElementById('yadisk-token-input');
    const tokenApply = document.getElementById('yadisk-token-apply');
    const tokenClear = document.getElementById('yadisk-token-clear');

    async function _currentProvider() {
      const p = await SyncProvider.getProvider();
      return p.name;
    }

    function _updateUIForProvider(providerName) {
      const descKey = providerName === 'yandex_disk' ? 'options.sync.desc.yandex' : 'options.sync.desc.google';
      providerDesc.textContent = I18n.t(descKey);
      providerDesc.dataset.i18n = descKey;
      tokenSection.style.display = providerName === 'yandex_disk' ? 'block' : 'none';
    }

    async function _updateSyncUI() {
      try {
        const providerName = await _currentProvider();
        providerSelect.value = providerName;
        _updateUIForProvider(providerName);

        if (providerName === 'yandex_disk') {
          const clientId = await YadiskSync.getClientId();
          if (clientInput) {
            clientInput.value = clientId;
          }

          const hasToken = await YadiskSync.isSignedIn();
          if (hasToken) {
            const result = await YadiskSync.verifyToken();
            if (result.valid) {
              statusText.textContent = I18n.t('options.sync.connected');
              statusText.className = 'sync-status-connected';
              signInBtn.style.display = 'none';
              signOutBtn.style.display = '';
              tokenSection.style.display = 'none';
            } else {
              statusText.textContent = I18n.t('options.sync.token.expired');
              statusText.className = 'sync-status-error';
              signInBtn.style.display = 'none';
              signOutBtn.style.display = '';
              tokenSection.style.display = 'block';
              clientSection.style.display = '';
              oauthBtn.style.display = 'none';
              tokenSectionInner.style.display = '';
              tokenClear.style.display = '';
            }
          } else {
            statusText.textContent = I18n.t('options.sync.disconnected');
            statusText.className = 'sync-status-disconnected';
            signInBtn.style.display = 'none';
            signOutBtn.style.display = 'none';

            tokenSection.style.display = 'block';
            clientSection.style.display = '';

            if (clientId) {
              oauthBtn.style.display = '';
              tokenSectionInner.style.display = 'none';
            } else {
              oauthBtn.style.display = 'none';
              tokenSectionInner.style.display = 'none';
            }
          }
        } else {
          const signedIn = await DriveSync.isSignedIn();
          if (signedIn) {
            statusText.textContent = I18n.t('options.sync.connected');
            statusText.className = 'sync-status-connected';
            signInBtn.style.display = 'none';
            signOutBtn.style.display = '';
          } else {
            statusText.textContent = I18n.t('options.sync.disconnected');
            statusText.className = 'sync-status-disconnected';
            signInBtn.style.display = '';
            signOutBtn.style.display = 'none';
          }
        }
      } catch {
        statusText.textContent = I18n.t('options.sync.error');
        statusText.className = 'sync-status-error';
        signInBtn.style.display = '';
        signOutBtn.style.display = 'none';
      }
    }

    await _updateSyncUI();
    await _updateStorageUsage();

    providerSelect.addEventListener('change', async () => {
      const newProvider = providerSelect.value;
      await SyncProvider.setProvider(newProvider);
      await _updateSyncUI();
    });

    clientApply.addEventListener('click', async () => {
      const clientId = clientInput.value.trim();
      if (!clientId) return;
      await YadiskSync.setClientId(clientId);
      await _updateSyncUI();
    });

    oauthBtn.addEventListener('click', async () => {
      try {
        console.log('[Options] Starting Yandex Disk OAuth...');
        await YadiskSync.signIn();
        statusText.textContent = I18n.t('options.sync.yadisk.oauth.opened');
        statusText.className = 'sync-status-info';
        oauthBtn.style.display = 'none';
        tokenSectionInner.style.display = '';
      } catch (e) {
        const msg = e?.message || String(e);
        console.error('[Options] OAuth failed:', e);
        statusText.textContent = I18n.t('options.sync.failed') + ': ' + msg;
        statusText.className = 'sync-status-error';
      }
    });

    signOutBtn.addEventListener('click', async () => {
      try {
        const result = await StorageManager.migrateToLocal();
        if (result) {
          console.log('[Options] Migrated from cloud to local:', result.saved + '/' + result.total + ' cards saved, ' + result.archived + ' overflow cards moved to archival storage');
        }
      } catch (e) {
        console.warn('[Options] Migration to local failed:', e);
      }
      await SyncProvider.signOut();
      await _updateSyncUI();
      await _updateStorageUsage();
    });

    tokenApply.addEventListener('click', async () => {
      const token = tokenInput.value.trim();
      if (!token) return;
      try {
        await YadiskSync.setToken(token);
        await SyncProvider.setProvider('yandex_disk');
        await StorageManager.migrateToCloud();
        tokenInput.value = '';
    await _updateSyncUI();
    await _updateStorageUsage();
      } catch (e) {
        const msg = e?.message || String(e);
        console.error('[Options] Yandex Disk token apply failed:', e);
        let displayMsg = I18n.t('options.sync.failed') + ': ' + msg;
        if (msg.includes('Failed to fetch') || msg.includes('TypeError')) {
          displayMsg += ' ' + (I18n.t('options.sync.csp_error') || 'Возможно, запросы к Яндекс.Диску заблокированы политикой безопасности.');
        } else if (msg.includes('401') || msg.includes('Unauthorized')) {
          displayMsg += ' ' + (I18n.t('options.sync.token.invalid') || 'Проверьте правильность токена и права доступа.');
        } else if (msg.includes('403')) {
          displayMsg += ' ' + (I18n.t('options.sync.token.forbidden') || 'Недостаточно прав доступа.');
        }
        statusText.textContent = displayMsg;
        statusText.className = 'sync-status-error';
      }
    });

    tokenClear.addEventListener('click', async () => {
      await YadiskSync.removeToken();
      await _updateSyncUI();
      await _updateStorageUsage();
    });
  })();

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
    const language = $langSelect?.value || 'en';

    settings = {
      theme,
      language,

      showFavicon: settings.showFavicon !== undefined ? settings.showFavicon : true,
      bookmarkSlots: Math.min(22, Math.max(2, parseInt(document.getElementById('bookmark-slots')?.value) || 22)),
      widgets: {
        clock: $clockChk ? $clockChk.checked : true,
        weather: $weatherChk ? $weatherChk.checked : false,
        weatherCity: $weatherCity ? $weatherCity.value.trim() || 'Moscow' : 'Moscow',
        weatherUnit: $weatherUnit ? $weatherUnit.value : 'metric'
      }
    };

    await StorageSync.set('settings', settings);
    await StorageManager.set(KanbanConstants.STORAGE_KEY, {
      columns: columns,
      tags: tags,
      performers: performers,
      authors: authors,
      _modified: Date.now()
    });
    applyTheme(theme);
    await I18n.setLang(language);
    _setVersion();
    renderTagsList();
    renderPerformersList();
    renderAuthorsList();
    renderColumnsList();
    _updateStorageUsage();

    const originalText = $saveBtn.textContent;
    $saveBtn.textContent = I18n.t('options.saved');
    $saveBtn.disabled = true;
    setTimeout(() => {
      $saveBtn.textContent = originalText;
      $saveBtn.disabled = false;
    }, 1500);
  });

  // ===== Back to board =====
  const $backBtn = document.getElementById('back-to-board');
  if ($backBtn) {
    $backBtn.addEventListener('click', () => {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = 'newtab.html';
      }
    });
  }

  // ===== OKX QR Modal =====
  const $okxBtn = document.getElementById('donate-okx-btn');
  const $okxModal = document.getElementById('okx-qr-modal');
  const $okxClose = document.getElementById('okx-qr-close');

  if ($okxBtn && $okxModal && $okxClose) {
    $okxBtn.addEventListener('click', () => {
      $okxModal.classList.add('active');
    });

    $okxClose.addEventListener('click', () => {
      $okxModal.classList.remove('active');
    });

    $okxModal.addEventListener('click', (e) => {
      if (e.target === $okxModal) {
        $okxModal.classList.remove('active');
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && $okxModal.classList.contains('active')) {
        $okxModal.classList.remove('active');
      }
    });
  }
});
