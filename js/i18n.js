'use strict';

const I18n = (() => {
  const KEY_MAP = {
    'app.name': 'appName',
    'bookmark.add.title': 'bookmarkAddTitle',
    'bookmark.url.placeholder': 'bookmarkUrlPlaceholder',
    'bookmark.title.placeholder': 'bookmarkTitlePlaceholder',
    'bookmark.cancel': 'bookmarkCancel',
    'bookmark.save': 'bookmarkSave',
    'bookmark.edit.title': 'bookmarkEditTitle',
    'bookmark.edit.url.placeholder': 'bookmarkEditUrlPlaceholder',
    'bookmark.edit.title.placeholder': 'bookmarkEditTitlePlaceholder',
    'bookmark.context.edit': 'bookmarkContextEdit',
    'bookmark.context.delete': 'bookmarkContextDelete',
    'card.placeholder.add.site': 'cardPlaceholderAddSite',
    'filter.all.assignees': 'filterAllAssignees',
    'filter.all.authors': 'filterAllAuthors',
    'filter.all.priorities': 'filterAllPriorities',

    'filter.search.placeholder': 'filterSearchPlaceholder',
    'filter.clear.title': 'filterClearTitle',
    'priority.low': 'priorityLow',
    'priority.medium': 'priorityMedium',
    'priority.high': 'priorityHigh',
    'priority.urgent': 'priorityUrgent',
    'tags.filter.all': 'tagsFilterAll',
    'tags.filter.selected': 'tagsFilterSelected',
    'tags.remove.title': 'tagsRemoveTitle',
    'modal.task': 'modalTask',
    'modal.title.placeholder': 'modalTitlePlaceholder',
    'modal.desc.placeholder': 'modalDescPlaceholder',
    'modal.assignee': 'modalAssignee',
    'modal.not.assigned': 'modalNotAssigned',
    'modal.author': 'modalAuthor',
    'modal.not.specified': 'modalNotSpecified',
    'modal.tags': 'modalTags',
    'modal.tags.select': 'modalTagsSelect',
    'modal.priority': 'modalPriority',
    'modal.no.priority': 'modalNoPriority',
    'modal.delete': 'modalDelete',
    'modal.cancel': 'modalCancel',
    'modal.save': 'modalSave',
    'modal.new.task': 'modalNewTask',
    'modal.edit.task': 'modalEditTask',
    'column.add.card': 'columnAddCard',
    'column.add.column': 'columnAddColumn',
    'column.add.title': 'columnAddTitle',
    'column.add.create': 'columnAddCreate',
    'column.new.column': 'columnNewColumn',
    'column.new.placeholder': 'columnNewPlaceholder',
    'column.new.color': 'columnNewColor',
    'column.delete': 'columnDelete',
    'column.delete.confirm': 'columnDeleteConfirm',
    'column.delete.card.confirm': 'columnDeleteCardConfirm',
    'column.no.tags': 'columnNoTags',
    'column.clear.cards': 'columnClearCards',
    'column.clear.cards.confirm': 'columnClearCardsConfirm',

    'column.clear.cards.wrong': 'columnClearCardsWrong',

    'settings.title': 'settingsTitle',
    'settings.open': 'settingsOpen',
    'options.title': 'optionsTitle',
    'options.tab.columns': 'optionsTabColumns',
    'options.tab.tags': 'optionsTabTags',
    'options.tab.performers': 'optionsTabPerformers',
    'options.tab.authors': 'optionsTabAuthors',
    'options.tab.appearance': 'optionsTabAppearance',
    'options.tab.sync': 'optionsTabSync',
    'options.sync.title': 'optionsSyncTitle',
    'options.sync.provider': 'optionsSyncProvider',
    'options.sync.provider.google': 'optionsSyncProviderGoogle',
    'options.sync.provider.yandex': 'optionsSyncProviderYandex',
    'options.sync.desc.google': 'optionsSyncDescGoogle',
    'options.sync.desc.yandex': 'optionsSyncDescYandex',
    'options.sync.checking': 'optionsSyncChecking',
    'options.sync.connected': 'optionsSyncConnected',
    'options.sync.disconnected': 'optionsSyncDisconnected',
    'options.sync.signin': 'optionsSyncSignin',
    'options.sync.signout': 'optionsSyncSignout',
    'options.sync.failed': 'optionsSyncFailed',
    'options.sync.error': 'optionsSyncError',
    'options.sync.token.expired': 'optionsSyncTokenExpired',
    'options.sync.yadisk.oauth.get': 'optionsSyncYadiskOauthGet',
    'options.sync.yadisk.oauth.opened': 'optionsSyncYadiskOauthOpened',
    'options.sync.yadisk.apply': 'optionsSyncYadiskApply',
    'options.sync.yadisk.clear': 'optionsSyncYadiskClear',
    'options.sync.yadisk.client.hint': 'optionsSyncYadiskClientHint',
    'options.sync.yadisk.client.step2': 'optionsSyncYadiskClientStep2',
    'options.sync.yadisk.client.step3': 'optionsSyncYadiskClientStep3',
    'options.sync.yadisk.client.step4': 'optionsSyncYadiskClientStep4',
    'options.sync.yadisk.client.step5': 'optionsSyncYadiskClientStep5',
    'options.sync.yadisk.client.save': 'optionsSyncYadiskClientSave',

    'options.columns.title': 'optionsColumnsTitle',
    'options.columns.desc': 'optionsColumnsDesc',
    'options.columns.add': 'optionsColumnsAdd',
    'options.columns.new': 'optionsColumnsNew',
    'options.tags.title': 'optionsTagsTitle',
    'options.tags.add': 'optionsTagsAdd',
    'options.tags.new': 'optionsTagsNew',
    'options.performers.title': 'optionsPerformersTitle',
    'options.performers.add': 'optionsPerformersAdd',
    'options.performers.new': 'optionsPerformersNew',
    'options.authors.title': 'optionsAuthorsTitle',
    'options.authors.add': 'optionsAuthorsAdd',
    'options.authors.new': 'optionsAuthorsNew',
    'options.appearance.theme': 'optionsAppearanceTheme',
    'options.appearance.light': 'optionsAppearanceLight',
    'options.appearance.dark': 'optionsAppearanceDark',
    'options.appearance.system': 'optionsAppearanceSystem',
    'options.appearance.language': 'optionsAppearanceLanguage',
    'options.back': 'optionsBack',
    'options.save': 'optionsSave',
    'options.saved': 'optionsSaved',
    'options.about.version': 'optionsAboutVersion',
    'options.about.desc': 'optionsAboutDesc',
    'options.about.storage': 'optionsAboutStorage',
    'options.support.title': 'optionsSupportTitle',
    'options.support.desc': 'optionsSupportDesc',
    'options.support.okx': 'optionsSupportOkx',
    'options.support.okx.hint': 'optionsSupportOkxHint',
    'options.support.okx.modalTitle': 'optionsSupportOkxModalTitle',
    'options.support.okx.modalDesc': 'optionsSupportOkxModalDesc',
    'card.old.tooltip': 'cardOldTooltip',
    'card.fire.tooltip': 'cardFireTooltip',
    'card.tags.placeholder': 'cardTagsPlaceholder',
    'card.tags.dropdown.header': 'cardTagsDropdownHeader',
    'card.tags.dropdown.clear': 'cardTagsDropdownClear',
    'card.tags.remove.title': 'cardTagsRemoveTitle',
    'widgets.clock': 'widgetsClock',
    'widgets.weather': 'widgetsWeather',
    'weather.city': 'weatherCity',
    'weather.city.placeholder': 'weatherCityPlaceholder',
    'weather.unit': 'weatherUnit',
    'weather.celsius': 'weatherCelsius',
    'weather.fahrenheit': 'weatherFahrenheit',
    'weather.error': 'weatherError',
    'weather.loading': 'weatherLoading',
    'options.widgets.title': 'optionsWidgetsTitle',
    'options.bookmarks.title': 'optionsBookmarksTitle',
    'options.bookmarks.slots': 'optionsBookmarksSlots',
    'options.bookmarks.slots.hint': 'optionsBookmarksSlotsHint',

    'homepage.modal.title': 'homepageModalTitle',
    'homepage.modal.desc': 'homepageModalDesc',
    'homepage.modal.copy': 'homepageModalCopy',
    'homepage.modal.copied': 'homepageModalCopied',
    'homepage.modal.close': 'homepageModalClose',
    'homepage.hint': 'homepageHint'
  };

  let _currentLang = null;
  let _messages = null;

  function _toCamelCase(key) {
    return KEY_MAP[key] || key;
  }

  function _substitute(msg, args) {
    if (!args || !msg) return msg;
    const arr = Array.isArray(args) ? args : Object.values(args).map(v => String(v));
    let i = 0;
    return msg.replace(/\{(\w+)\}|\$(\w+)\$/g, () => (arr[i++] || '').replace(/\$/g, '$$$$'));
  }

  function t(key, args) {
    const msgKey = _toCamelCase(key);
    if (_messages && _messages[msgKey]) {
      return _substitute(_messages[msgKey], args);
    }
    const subs = Array.isArray(args) ? args : (args ? Object.values(args).map(v => String(v)) : undefined);
    let msg = chrome.i18n.getMessage(msgKey, subs);
    if (msg !== undefined && msg !== '') return msg;
    if (msgKey !== key) {
      msg = chrome.i18n.getMessage(key, subs);
      if (msg !== undefined && msg !== '') return msg;
    }
    console.warn('[I18n] Missing translation key:', key);
    return key;
  }

  async function _loadMessages(lang) {
    const url = chrome.runtime.getURL('_locales/' + lang + '/messages.json');
    try {
      const resp = await fetch(url);
      const raw = await resp.json();
      const out = {};
      for (const [k, v] of Object.entries(raw)) {
        out[k] = v.message;
      }
      _messages = out;
    } catch {
      _messages = null;
    }
  }

  function getLang() {
    if (_currentLang) return _currentLang;
    const uiLang = chrome.i18n.getUILanguage();
    if (uiLang.startsWith('ru')) return 'ru';
    if (uiLang.startsWith('zh')) return 'zh';
    return 'en';
  }

  async function init() {
    const settings = await StorageSync.get('settings');
    const savedLang = settings && settings.language;
    if (savedLang && ['ru', 'en', 'zh'].includes(savedLang)) {
      _currentLang = savedLang;
    } else {
      _currentLang = getLang();
    }
    await _loadMessages(_currentLang);
    document.documentElement.setAttribute('lang', _currentLang === 'zh' ? 'zh-CN' : _currentLang === 'ru' ? 'ru-RU' : 'en-US');
    applyTranslations();
  }

  async function setLang(locale) {
    if (!['ru', 'en', 'zh'].includes(locale)) return;
    _currentLang = locale;
    await _loadMessages(locale);
    document.documentElement.setAttribute('lang', locale === 'zh' ? 'zh-CN' : locale === 'ru' ? 'ru-RU' : 'en-US');
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
