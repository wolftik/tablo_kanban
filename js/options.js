document.addEventListener('DOMContentLoaded', async () => {
  let settings = await Storage.get('settings') || Storage.getDefaultSettings();
  let tags = settings.tags || Storage.getDefaultTags();
  let performers = settings.performers || Storage.getDefaultPerformers();
  let authors = settings.authors || [];
  setupTabs();

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

  function renderTagsList() {
    const list = document.getElementById('tags-list');
    if (!list) return;

    list.innerHTML = '';

    tags.forEach((tag, index) => {
      const item = document.createElement('div');
      item.className = 'tag-option-item';

      const color = document.createElement('input');
      color.type = 'color';
      color.value = tag.color || '#6366f1';
      color.className = 'tag-color';

      const name = document.createElement('input');
      name.type = 'text';
      name.value = tag.name;
      name.className = 'tag-name';
      name.placeholder = 'Название тега';

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'tag-delete-btn';
      deleteBtn.innerHTML = '&times;';
      deleteBtn.addEventListener('click', () => {
        tags = tags.filter(t => t.id !== tag.id);
        renderTagsList();
      });

      item.appendChild(color);
      item.appendChild(name);
      item.appendChild(deleteBtn);
      list.appendChild(item);

      const updateTag = () => {
        const found = tags.find(t => t.id === tag.id);
        if (found) {
          found.name = name.value;
          found.color = color.value;
        }
      };

      name.addEventListener('blur', updateTag);
      color.addEventListener('input', updateTag);
    });
  }

  document.getElementById('add-tag-option').addEventListener('click', () => {
    tags.push({
      id: Storage.generateId(),
      name: 'Новый тег',
      color: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')
    });
    renderTagsList();
  });

  function renderPerformersList() {
    const list = document.getElementById('performers-list');
    if (!list) return;

    list.innerHTML = '';

    performers.forEach((performer) => {
      const item = document.createElement('div');
      item.className = 'tag-option-item';

      const color = document.createElement('input');
      color.type = 'color';
      color.value = performer.color || '#6366f1';
      color.className = 'tag-color';

      const name = document.createElement('input');
      name.type = 'text';
      name.value = performer.name;
      name.className = 'tag-name';
      name.placeholder = 'Имя исполнителя';

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'tag-delete-btn';
      deleteBtn.innerHTML = '&times;';
      deleteBtn.addEventListener('click', () => {
        performers = performers.filter(p => p.id !== performer.id);
        renderPerformersList();
      });

      item.appendChild(color);
      item.appendChild(name);
      item.appendChild(deleteBtn);
      list.appendChild(item);

      const updatePerformer = () => {
        const found = performers.find(p => p.id === performer.id);
        if (found) {
          found.name = name.value;
          found.color = color.value;
        }
      };

      name.addEventListener('blur', updatePerformer);
      color.addEventListener('input', updatePerformer);
    });
  }

  renderPerformersList();

  document.getElementById('add-performer-option').addEventListener('click', () => {
    performers.push({
      id: Storage.generateId(),
      name: 'Новый исполнитель',
      color: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')
    });
    renderPerformersList();
  });

  function renderAuthorsList() {
    const list = document.getElementById('authors-list');
    if (!list) return;

    list.innerHTML = '';

    authors.forEach((author, index) => {
      const item = document.createElement('div');
      item.className = 'tag-option-item';

      const name = document.createElement('input');
      name.type = 'text';
      name.value = author.name;
      name.className = 'tag-name';
      name.placeholder = 'Имя автора';

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'tag-delete-btn';
      deleteBtn.innerHTML = '&times;';
      deleteBtn.addEventListener('click', () => {
        authors = authors.filter(a => a.id !== author.id);
        renderAuthorsList();
      });

      item.appendChild(name);
      item.appendChild(deleteBtn);
      list.appendChild(item);

      const updateAuthor = () => {
        const found = authors.find(a => a.id === author.id);
        if (found) {
          found.name = name.value;
        }
      };

      name.addEventListener('blur', updateAuthor);
    });
  }

  renderAuthorsList();

  document.getElementById('add-author-option').addEventListener('click', () => {
    authors.push({
      id: Storage.generateId(),
      name: 'Новый автор'
    });
    renderAuthorsList();
  });

  function loadSettingsUI() {
    const theme = settings.theme || 'system';
    const cardSize = settings.cardSize || 'standard';

    document.querySelectorAll('input[name="theme"]').forEach(radio => {
      radio.checked = radio.value === theme;
    });

    document.querySelectorAll('input[name="card-size"]').forEach(radio => {
      radio.checked = radio.value === cardSize;
    });
  }

  document.getElementById('save-options').addEventListener('click', async () => {
    const theme = document.querySelector('input[name="theme"]:checked')?.value || 'system';
    const cardSize = document.querySelector('input[name="card-size"]:checked')?.value || 'standard';

    settings = {
      theme: theme,
      cardSize: cardSize,
      tags: tags,
      columns: settings.columns || Storage.getDefaultColumns(),
      performers: performers,
      authors: authors,
      kanbanFilter: settings.kanbanFilter || {}
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
