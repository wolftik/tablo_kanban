'use strict';

const I18n = (() => {
  const LOCALES = {
    ru: {
      'app.name': 'Tablo Kanban',
      'app.description': 'Панель закладок и канбан-доска для новой вкладки Chrome',

      'bookmark.add.title': 'Добавить закладку',
      'bookmark.url.placeholder': 'URL (https://example.com)',
      'bookmark.title.placeholder': 'Название',
      'bookmark.cancel': 'Отмена',
      'bookmark.save': 'Сохранить',
      'bookmark.edit.title': 'Редактировать закладку',
      'bookmark.edit.url.placeholder': 'URL',
      'bookmark.edit.title.placeholder': 'Название',
      'bookmark.context.edit': 'Редактировать',
      'bookmark.context.delete': 'Удалить',
      'card.placeholder.add.site': 'Добавить сайт',

      'filter.all.assignees': 'Все исполнители',
      'filter.all.priorities': 'Все приоритеты',
      'filter.all.tags': 'Все теги',
      'filter.search.placeholder': 'Поиск задач...',
      'filter.clear.title': 'Очистить фильтры',
      'filter.selected.count': '{count} выбрано',

      'priority.low': 'Низкий',
      'priority.medium': 'Средний',
      'priority.high': 'Высокий',
      'priority.urgent': 'Срочный',

      'tags.filter.all': 'Все теги',
      'tags.filter.selected': '{count} выбрано',
      'tags.remove.title': 'Удалить фильтр',

      'modal.task': 'Задача',
      'modal.title.placeholder': 'Название задачи',
      'modal.desc.placeholder': 'Описание',
      'modal.assignee': 'Исполнитель:',
      'modal.not.assigned': 'Не назначен',
      'modal.author': 'Автор:',
      'modal.not.specified': 'Не указан',
      'modal.tags': 'Теги:',
      'modal.tags.all': 'Все теги',
      'modal.tags.clear': 'Очистить',
      'modal.tags.select': 'Выбрать теги',
      'modal.priority': 'Приоритет:',
      'modal.no.priority': 'Без приоритета',
      'modal.delete': 'Удалить',
      'modal.cancel': 'Отмена',
      'modal.save': 'Сохранить',
      'modal.new.task': 'Новая задача',
      'modal.edit.task': 'Редактировать задачу',

      'column.add.card': '+ Добавить задачу',
      'column.add.column': '+ Добавить колонку',
      'column.new.column': 'Новая колонка',
      'column.edit': 'Редактировать',
      'column.delete': 'Удалить',
      'column.delete.confirm': 'Удалить колонку "{title}" и все её задачи?',
      'column.delete.card.confirm': 'Удалить задачу "{title}"?',
      'column.untitled': 'Без названия',
      'column.no.tags': 'Нет тегов',
      'column.no.name': 'Без названия',

      'card.date.format': 'ru-RU',

      'settings.title': 'Настройки',
      'settings.open': 'Открыть Tablo Kanban',

      'options.title': 'Настройки — Tablo Kanban',
      'options.tab.columns': 'Колонки',
      'options.tab.tags': 'Теги',
      'options.tab.performers': 'Исполнители',
      'options.tab.authors': 'Авторы',
      'options.tab.appearance': 'Настройки',
      'options.tab.about': 'О расширении',
      'options.columns.title': 'Колонки доски',
      'options.columns.desc': 'Перетаскивайте для изменения порядка. Для удаления нажмите \u00D7.',
      'options.columns.add': 'Добавить колонку',
      'options.columns.new': 'Новая колонка',
      'options.tags.title': 'Теги',
      'options.tags.add': 'Добавить тег',
      'options.tags.new': 'Новый тег',
      'options.performers.title': 'Исполнители',
      'options.performers.add': 'Добавить исполнителя',
      'options.performers.new': 'Новый исполнитель',
      'options.authors.title': 'Авторы',
      'options.authors.add': 'Добавить автора',
      'options.authors.new': 'Новый автор',
      'options.appearance.theme': 'Тема',
      'options.appearance.light': 'Светлая',
      'options.appearance.dark': 'Тёмная',
      'options.appearance.system': 'Системная',
      'options.appearance.language': 'Язык',
      'options.save': 'Сохранить',
      'options.saved': 'Сохранено!',
      'options.about.version': 'Версия 1.0.0',
      'options.about.desc': 'Панель закладок и канбан-доска для новой вкладки Chrome.',
      'options.about.storage': 'Настройки хранятся в chrome.storage.sync (синхронизация между устройствами), данные доски — в chrome.storage.local.',
      'options.support.title': 'Поддержать проект',
      'options.support.desc': 'Если расширение вам полезно, вы можете поддержать его развитие:',

      'card.tags.placeholder': 'Все теги',
      'card.tags.dropdown.header': 'Выберите теги',
      'card.tags.dropdown.clear': 'Очистить',
      'card.tags.remove.title': 'Удалить тег',

      'widgets.clock': 'Часы',
      'widgets.weather': 'Погода',
      'weather.city': 'Город',
      'weather.city.placeholder': 'Например: Москва',
      'weather.unit': 'Единицы',
      'weather.celsius': '°C',
      'weather.fahrenheit': '°F',
      'weather.error': 'Нет данных',
      'weather.loading': 'Загрузка...',
      'options.widgets.title': 'Виджеты'
    },

    en: {
      'app.name': 'Tablo Kanban',
      'app.description': 'Bookmarks bar and Kanban board as new tab page',

      'bookmark.add.title': 'Add Bookmark',
      'bookmark.url.placeholder': 'URL (https://example.com)',
      'bookmark.title.placeholder': 'Title',
      'bookmark.cancel': 'Cancel',
      'bookmark.save': 'Save',
      'bookmark.edit.title': 'Edit Bookmark',
      'bookmark.edit.url.placeholder': 'URL',
      'bookmark.edit.title.placeholder': 'Title',
      'bookmark.context.edit': 'Edit',
      'bookmark.context.delete': 'Delete',
      'card.placeholder.add.site': 'Add site',

      'filter.all.assignees': 'All assignees',
      'filter.all.priorities': 'All priorities',
      'filter.all.tags': 'All tags',
      'filter.search.placeholder': 'Search tasks...',
      'filter.clear.title': 'Clear filters',
      'filter.selected.count': '{count} selected',

      'priority.low': 'Low',
      'priority.medium': 'Medium',
      'priority.high': 'High',
      'priority.urgent': 'Urgent',

      'tags.filter.all': 'All tags',
      'tags.filter.selected': '{count} selected',
      'tags.remove.title': 'Remove filter',

      'modal.task': 'Task',
      'modal.title.placeholder': 'Task title',
      'modal.desc.placeholder': 'Description',
      'modal.assignee': 'Assignee:',
      'modal.not.assigned': 'Not assigned',
      'modal.author': 'Author:',
      'modal.not.specified': 'Not specified',
      'modal.tags': 'Tags:',
      'modal.tags.all': 'All tags',
      'modal.tags.clear': 'Clear',
      'modal.tags.select': 'Select tags',
      'modal.priority': 'Priority:',
      'modal.no.priority': 'No priority',
      'modal.delete': 'Delete',
      'modal.cancel': 'Cancel',
      'modal.save': 'Save',
      'modal.new.task': 'New Task',
      'modal.edit.task': 'Edit Task',

      'column.add.card': '+ Add Card',
      'column.add.column': '+ Add Column',
      'column.new.column': 'New Column',
      'column.edit': 'Edit',
      'column.delete': 'Delete',
      'column.delete.confirm': 'Delete column "{title}" and all its cards?',
      'column.delete.card.confirm': 'Delete task "{title}"?',
      'column.untitled': 'Untitled',
      'column.no.tags': 'No tags',
      'column.no.name': 'Untitled',

      'card.date.format': 'en-US',

      'settings.title': 'Settings',
      'settings.open': 'Open Tablo Kanban',

      'options.title': 'Settings — Tablo Kanban',
      'options.tab.columns': 'Columns',
      'options.tab.tags': 'Tags',
      'options.tab.performers': 'Performers',
      'options.tab.authors': 'Authors',
      'options.tab.appearance': 'Appearance',
      'options.tab.about': 'About',
      'options.columns.title': 'Board Columns',
      'options.columns.desc': 'Drag to reorder. Click \u00D7 to delete.',
      'options.columns.add': 'Add Column',
      'options.columns.new': 'New Column',
      'options.tags.title': 'Tags',
      'options.tags.add': 'Add Tag',
      'options.tags.new': 'New Tag',
      'options.performers.title': 'Performers',
      'options.performers.add': 'Add Performer',
      'options.performers.new': 'New Performer',
      'options.authors.title': 'Authors',
      'options.authors.add': 'Add Author',
      'options.authors.new': 'New Author',
      'options.appearance.theme': 'Theme',
      'options.appearance.light': 'Light',
      'options.appearance.dark': 'Dark',
      'options.appearance.system': 'System',
      'options.appearance.language': 'Language',
      'options.save': 'Save',
      'options.saved': 'Saved!',
      'options.about.version': 'Version 1.0.0',
      'options.about.desc': 'Bookmarks bar and Kanban board for your Chrome new tab page.',
      'options.about.storage': 'Settings are stored in chrome.storage.sync (sync across devices), board data in chrome.storage.local.',
      'options.support.title': 'Support the Project',
      'options.support.desc': 'If you find this extension useful, you can support its development:',

      'card.tags.placeholder': 'All tags',
      'card.tags.dropdown.header': 'Select tags',
      'card.tags.dropdown.clear': 'Clear',
      'card.tags.remove.title': 'Remove tag',

      'widgets.clock': 'Clock',
      'widgets.weather': 'Weather',
      'weather.city': 'City',
      'weather.city.placeholder': 'e.g. London',
      'weather.unit': 'Units',
      'weather.celsius': '°C',
      'weather.fahrenheit': '°F',
      'weather.error': 'No data',
      'weather.loading': 'Loading...',
      'options.widgets.title': 'Widgets'
    },

    zh: {
      'app.name': 'Tablo Kanban',
      'app.description': '书签栏和看板面板，作为新标签页使用',

      'bookmark.add.title': '添加书签',
      'bookmark.url.placeholder': 'URL (https://example.com)',
      'bookmark.title.placeholder': '标题',
      'bookmark.cancel': '取消',
      'bookmark.save': '保存',
      'bookmark.edit.title': '编辑书签',
      'bookmark.edit.url.placeholder': 'URL',
      'bookmark.edit.title.placeholder': '标题',
      'bookmark.context.edit': '编辑',
      'bookmark.context.delete': '删除',
      'card.placeholder.add.site': '添加网站',

      'filter.all.assignees': '所有执行者',
      'filter.all.priorities': '所有优先级',
      'filter.all.tags': '所有标签',
      'filter.search.placeholder': '搜索任务...',
      'filter.clear.title': '清除筛选',
      'filter.selected.count': '已选{count}项',

      'priority.low': '低',
      'priority.medium': '中',
      'priority.high': '高',
      'priority.urgent': '紧急',

      'tags.filter.all': '所有标签',
      'tags.filter.selected': '已选{count}项',
      'tags.remove.title': '移除筛选',

      'modal.task': '任务',
      'modal.title.placeholder': '任务标题',
      'modal.desc.placeholder': '描述',
      'modal.assignee': '执行者：',
      'modal.not.assigned': '未分配',
      'modal.author': '作者：',
      'modal.not.specified': '未指定',
      'modal.tags': '标签：',
      'modal.tags.all': '所有标签',
      'modal.tags.clear': '清除',
      'modal.tags.select': '选择标签',
      'modal.priority': '优先级：',
      'modal.no.priority': '无优先级',
      'modal.delete': '删除',
      'modal.cancel': '取消',
      'modal.save': '保存',
      'modal.new.task': '新任务',
      'modal.edit.task': '编辑任务',

      'column.add.card': '+ 添加卡片',
      'column.add.column': '+ 添加列',
      'column.new.column': '新列',
      'column.edit': '编辑',
      'column.delete': '删除',
      'column.delete.confirm': '删除列"{title}"及其所有卡片？',
      'column.delete.card.confirm': '删除任务"{title}"？',
      'column.untitled': '无标题',
      'column.no.tags': '无标签',
      'column.no.name': '无标题',

      'card.date.format': 'zh-CN',

      'settings.title': '设置',
      'settings.open': '打开 Tablo Kanban',

      'options.title': '设置 — Tablo Kanban',
      'options.tab.columns': '列',
      'options.tab.tags': '标签',
      'options.tab.performers': '执行者',
      'options.tab.authors': '作者',
      'options.tab.appearance': '外观',
      'options.tab.about': '关于',
      'options.columns.title': '看板列',
      'options.columns.desc': '拖拽排序。点击 \u00D7 删除。',
      'options.columns.add': '添加列',
      'options.columns.new': '新列',
      'options.tags.title': '标签',
      'options.tags.add': '添加标签',
      'options.tags.new': '新标签',
      'options.performers.title': '执行者',
      'options.performers.add': '添加执行者',
      'options.performers.new': '新执行者',
      'options.authors.title': '作者',
      'options.authors.add': '添加作者',
      'options.authors.new': '新作者',
      'options.appearance.theme': '主题',
      'options.appearance.light': '浅色',
      'options.appearance.dark': '深色',
      'options.appearance.system': '系统',
      'options.appearance.language': '语言',
      'options.save': '保存',
      'options.saved': '已保存！',
      'options.about.version': '版本 1.0.0',
      'options.about.desc': '适用于 Chrome 新标签页的书签栏和看板面板。',
      'options.about.storage': '设置存储在 chrome.storage.sync（跨设备同步），看板数据存储在 chrome.storage.local。',
      'options.support.title': '支持项目',
      'options.support.desc': '如果您觉得此扩展有用，可以支持其开发：',

      'card.tags.placeholder': '所有标签',
      'card.tags.dropdown.header': '选择标签',
      'card.tags.dropdown.clear': '清除',
      'card.tags.remove.title': '移除标签',

      'widgets.clock': '时钟',
      'widgets.weather': '天气',
      'weather.city': '城市',
      'weather.city.placeholder': '例如：上海',
      'weather.unit': '单位',
      'weather.celsius': '°C',
      'weather.fahrenheit': '°F',
      'weather.error': '无数据',
      'weather.loading': '加载中...',
      'options.widgets.title': '组件'
    }
  };

  let _currentLang = 'ru';
  let _initialized = false;

  function _interpolate(str, args) {
    if (!args) return str;
    return str.replace(/\{(\w+)\}/g, (match, key) => {
      return args[key] !== undefined ? args[key] : match;
    });
  }

  async function init() {
    const settings = await StorageSync.get('settings');
    _currentLang = (settings && settings.language) || 'ru';
    document.documentElement.setAttribute('lang', _currentLang);
    _initialized = true;
    applyTranslations();
  }

  function t(key, args) {
    const locale = LOCALES[_currentLang];
    if (locale && locale[key] !== undefined) {
      return _interpolate(locale[key], args);
    }
    if (LOCALES.ru[key] !== undefined) {
      return _interpolate(LOCALES.ru[key], args);
    }
    console.warn('[I18n] Missing translation key:', key);
    return key;
  }

  function getLang() {
    return _currentLang;
  }

  async function setLang(locale) {
    if (!LOCALES[locale]) return;
    _currentLang = locale;
    document.documentElement.setAttribute('lang', _currentLang);
    const settings = await StorageSync.get('settings') || {};
    settings.language = locale;
    await StorageSync.set('settings', settings);
    applyTranslations();
  }

  function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      let args = null;
      if (el.dataset.i18nArgs) {
        try { args = JSON.parse(el.dataset.i18nArgs); } catch {}
      }
      el.textContent = t(key, args);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      el.placeholder = t(el.dataset.i18nPlaceholder);
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      el.title = t(el.dataset.i18nTitle);
    });
  }

  function localeToBCP47(lang) {
    const map = { ru: 'ru-RU', en: 'en-US', zh: 'zh-CN' };
    return map[lang] || 'en-US';
  }

  return { init, t, getLang, setLang, applyTranslations, localeToBCP47 };
})();
