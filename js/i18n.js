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
      'column.add.title': 'Новая колонка',
      'column.add.create': 'Создать',
      'column.new.column': 'Новая колонка',
      'column.new.placeholder': 'Название колонки',
      'column.new.color': 'Цвет:',
      'column.delete': 'Удалить',
      'column.delete.confirm': 'Удалить колонку "{title}" и все её задачи?',
      'column.delete.card.confirm': 'Удалить задачу "{title}"?',
      'column.untitled': 'Без названия',
      'column.no.tags': 'Нет тегов',
      'column.no.name': 'Без названия',
      'column.clear.cards': 'Очистить задачи',
      'column.clear.cards.confirm': 'Введите "{phrase}" для подтверждения',
      'column.clear.cards.placeholder': 'очистить',
      'column.clear.cards.wrong': 'Неверная фраза',

      'card.date.format': 'ru-RU',

      'settings.title': 'Настройки',
      'settings.open': 'Открыть Tablo Kanban',

      'options.title': 'Настройки — Tablo Kanban',
      'options.tab.columns': 'Колонки',
      'options.tab.tags': 'Теги',
      'options.tab.performers': 'Исполнители',
      'options.tab.authors': 'Авторы',
      'options.tab.appearance': 'Настройки',
      'options.tab.sync': 'Синхронизация',
      'options.sync.title': 'Синхронизация',
      'options.sync.provider': 'Провайдер синхронизации:',
      'options.sync.provider.google': 'Google Drive',
      'options.sync.provider.yandex': 'Яндекс.Диск',
      'options.sync.desc.google': 'Данные канбан-доски будут синхронизироваться между устройствами через ваш Google Drive.',
      'options.sync.desc.yandex': 'Данные канбан-доски будут синхронизироваться между устройствами через ваш Яндекс.Диск.',
      'options.sync.checking': 'Проверка статуса...',
      'options.sync.connected': 'Синхронизация подключена',
      'options.sync.disconnected': 'Синхронизация не подключена',
      'options.sync.signin': 'Подключить',
      'options.sync.signout': 'Отключить синхронизацию',
      'options.sync.failed': 'Ошибка подключения',
      'options.sync.error': 'Ошибка проверки',
      'options.sync.yadisk.hint': 'Для подключения Яндекс.Диска необходимо получить OAuth-токен:',
      'options.sync.yadisk.paste': 'Вставьте токен в поле ниже',
      'options.sync.yadisk.apply': 'Сохранить токен',
      'options.sync.yadisk.clear': 'Очистить токен',
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
      'options.about.storage': 'Данные доски хранятся локально в chrome.storage.local. Настройки и ключи API — в chrome.storage.sync (синхронизация между устройствами). Данные доски синхронизируются через выбранного провайдера (Google Drive или Яндекс.Диск).',
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
      'options.widgets.title': 'Виджеты',
      'options.bookmarks.title': 'Закладки',
      'options.bookmarks.slots': 'Количество закладок:',
      'options.bookmarks.slots.hint': 'Максимум 22. Должно быть чётным числом.'
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
      'column.add.title': 'New Column',
      'column.add.create': 'Create',
      'column.new.column': 'New Column',
      'column.new.placeholder': 'Column name',
      'column.new.color': 'Color:',
      'column.delete': 'Delete',
      'column.delete.confirm': 'Delete column "{title}" and all its cards?',
      'column.delete.card.confirm': 'Delete task "{title}"?',
      'column.untitled': 'Untitled',
      'column.no.tags': 'No tags',
      'column.no.name': 'Untitled',
      'column.clear.cards': 'Clear all cards',
      'column.clear.cards.confirm': 'Type "{phrase}" to confirm',
      'column.clear.cards.placeholder': 'clear',
      'column.clear.cards.wrong': 'Wrong phrase',

      'card.date.format': 'en-US',

      'settings.title': 'Settings',
      'settings.open': 'Open Tablo Kanban',

      'options.title': 'Settings — Tablo Kanban',
      'options.tab.columns': 'Columns',
      'options.tab.tags': 'Tags',
      'options.tab.performers': 'Performers',
      'options.tab.authors': 'Authors',
      'options.tab.appearance': 'Appearance',
      'options.tab.sync': 'Sync',
      'options.sync.title': 'Sync',
      'options.sync.provider': 'Sync provider:',
      'options.sync.provider.google': 'Google Drive',
      'options.sync.provider.yandex': 'Yandex Disk',
      'options.sync.desc.google': 'Kanban board data will sync across devices via your Google Drive.',
      'options.sync.desc.yandex': 'Kanban board data will sync across devices via your Yandex Disk.',
      'options.sync.checking': 'Checking status...',
      'options.sync.connected': 'Sync connected',
      'options.sync.disconnected': 'Sync not connected',
      'options.sync.signin': 'Connect',
      'options.sync.signout': 'Disconnect sync',
      'options.sync.failed': 'Connection failed',
      'options.sync.error': 'Status check failed',
      'options.sync.yadisk.hint': 'To connect Yandex Disk, you need an OAuth token:',
      'options.sync.yadisk.paste': 'Paste the token in the field below',
      'options.sync.yadisk.apply': 'Save token',
      'options.sync.yadisk.clear': 'Clear token',
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
      'options.about.storage': 'Board data is stored locally in chrome.storage.local. Settings and API keys are in chrome.storage.sync (synced across devices). Board data is synced via a chosen provider (Google Drive or Yandex Disk).',
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
      'options.widgets.title': 'Widgets',
      'options.bookmarks.title': 'Bookmarks',
      'options.bookmarks.slots': 'Number of bookmarks:',
      'options.bookmarks.slots.hint': 'Maximum 22. Must be an even number.'
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
      'column.add.title': '新列',
      'column.add.create': '创建',
      'column.new.column': '新列',
      'column.new.placeholder': '列名称',
      'column.new.color': '颜色：',
      'column.delete': '删除',
      'column.delete.confirm': '删除列"{title}"及其所有卡片？',
      'column.delete.card.confirm': '删除任务"{title}"？',
      'column.untitled': '无标题',
      'column.no.tags': '无标签',
      'column.no.name': '无标题',
      'column.clear.cards': '清空卡片',
      'column.clear.cards.confirm': '输入"{phrase}"确认',
      'column.clear.cards.placeholder': '清空',
      'column.clear.cards.wrong': '短语错误',

      'card.date.format': 'zh-CN',

      'settings.title': '设置',
      'settings.open': '打开 Tablo Kanban',

      'options.title': '设置 — Tablo Kanban',
      'options.tab.columns': '列',
      'options.tab.tags': '标签',
      'options.tab.performers': '执行者',
      'options.tab.authors': '作者',
      'options.tab.appearance': '外观',
      'options.tab.sync': '同步',
      'options.sync.title': '同步',
      'options.sync.provider': '同步提供商：',
      'options.sync.provider.google': 'Google Drive',
      'options.sync.provider.yandex': 'Yandex Disk',
      'options.sync.desc.google': '看板数据将通过您的 Google Drive 跨设备同步。',
      'options.sync.desc.yandex': '看板数据将通过您的 Yandex Disk 跨设备同步。',
      'options.sync.checking': '检查状态...',
      'options.sync.connected': '同步已连接',
      'options.sync.disconnected': '同步未连接',
      'options.sync.signin': '连接',
      'options.sync.signout': '断开同步',
      'options.sync.failed': '连接失败',
      'options.sync.error': '状态检查失败',
      'options.sync.yadisk.hint': '要连接 Yandex Disk，您需要一个 OAuth 令牌：',
      'options.sync.yadisk.paste': '将令牌粘贴到下面的字段中',
      'options.sync.yadisk.apply': '保存令牌',
      'options.sync.yadisk.clear': '清除令牌',
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
      'options.about.storage': '看板数据存储在 chrome.storage.local。设置和 API 密钥存储在 chrome.storage.sync（跨设备同步）。看板数据通过所选提供商（Google Drive 或 Yandex Disk）同步。',
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
      'options.widgets.title': '组件',
      'options.bookmarks.title': '书签',
      'options.bookmarks.slots': '书签数量：',
      'options.bookmarks.slots.hint': '最多 22 个。必须为偶数。'
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
