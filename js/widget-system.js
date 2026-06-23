'use strict';

const WidgetSystem = (() => {
  const _widgets = new Map();

  function register(name, widget) {
    if (_widgets.has(name)) {
      console.warn(`Widget "${name}" already registered`);
      return;
    }
    _widgets.set(name, widget);
  }

  async function initAll() {
    for (const [name, widget] of _widgets) {
      try {
        if (widget.init) await widget.init();
      } catch (e) {
        console.error(`Widget "${name}" init error:`, e);
      }
    }
  }

  function unregister(name) {
    const widget = _widgets.get(name);
    if (!widget) return;
    if (widget.destroy) widget.destroy();
    _widgets.delete(name);
  }

  function destroyAll() {
    for (const [name] of _widgets) {
      unregister(name);
    }
  }

  function getWidgets() {
    return _widgets;
  }

  return { register, unregister, initAll, destroyAll, getWidgets };
})();

const ClockWidget = {
  _interval: null,

  async init() {
    const settings = await StorageSync.get('settings') || getDefaultSettings();
    const enabled = settings.widgets?.clock !== false;
    const zone = document.getElementById('widgets-zone');
    if (!zone) return;

    if (!enabled) {
      zone.classList.remove('active');
      this.destroy();
      return;
    }

    let sidebar = document.getElementById('widgets-sidebar');
    if (!sidebar) {
      sidebar = document.createElement('div');
      sidebar.id = 'widgets-sidebar';
      sidebar.className = 'widgets-sidebar';
      zone.appendChild(sidebar);
    }

    const el = document.createElement('div');
    el.id = 'clock-widget';
    el.className = 'widget clock-widget';

    const timeEl = document.createElement('div');
    timeEl.className = 'clock-time';
    const timeTextNode = document.createTextNode('--:--');
    timeEl.appendChild(timeTextNode);

    const dateEl = document.createElement('div');
    dateEl.className = 'clock-date';
    dateEl.textContent = '---';

    el.appendChild(timeEl);
    el.appendChild(dateEl);
    sidebar.appendChild(el);
    zone.classList.add('active');
    zone.dataset.enabled = 'true';

    const update = () => {
      const now = new Date();
      const lang = I18n.getLang();
      const locale = I18n.localeToBCP47(lang);
      timeTextNode.textContent = now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
      dateEl.textContent = now.toLocaleDateString(locale, { day: 'numeric', month: 'long', weekday: 'short' });
    };
    update();
    this._interval = setInterval(update, 1000);
  },

  destroy() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }
    const el = document.getElementById('clock-widget');
    if (el) el.remove();
  }
};

// register moved to end of file

const WMO_ICONS = {
  0: '\u2600\uFE0F',   1: '\uD83C\uDF24\uFE0F', 2: '\u26C5',
  3: '\u26C5',         4: '\u2601\uFE0F',       45: '\uD83C\uDF2B\uFE0F',
  48: '\uD83C\uDF2B\uFE0F', 51: '\uD83D\uDCA7', 53: '\uD83D\uDCA7',
  55: '\uD83D\uDCA7',  56: '\uD83D\uDCA7',      57: '\uD83D\uDCA7',
  61: '\uD83C\uDF27\uFE0F', 63: '\uD83C\uDF27\uFE0F', 65: '\uD83C\uDF27\uFE0F',
  66: '\uD83C\uDF27\uFE0F', 67: '\uD83C\uDF27\uFE0F', 71: '\u2744\uFE0F',
  73: '\u2744\uFE0F',  75: '\u2744\uFE0F',      77: '\u2744\uFE0F',
  80: '\uD83C\uDF26\uFE0F', 81: '\uD83C\uDF26\uFE0F', 82: '\uD83C\uDF26\uFE0F',
  85: '\uD83C\uDF28\uFE0F', 86: '\uD83C\uDF28\uFE0F', 95: '\u26A1',
  96: '\u26A1',        99: '\u26A1'
};

function _wmoIcon(code) {
  return WMO_ICONS[code] || '\u2601\uFE0F';
}

const WEATHER_REFRESH_MS = 7200000;  // 2 hours

const WeatherWidget = {
  _interval: null,
  _el: null,

  async init() {
    const settings = await StorageSync.get('settings') || getDefaultSettings();
    const enabled = settings.widgets?.weather === true;
    const zone = document.getElementById('widgets-zone');
    if (!zone) return;

    if (!enabled) { this.destroy(); return; }

    let sidebar = document.getElementById('widgets-sidebar');
    if (!sidebar) {
      sidebar = document.createElement('div');
      sidebar.id = 'widgets-sidebar';
      sidebar.className = 'widgets-sidebar';
      zone.appendChild(sidebar);
    }

    this._el = document.createElement('div');
    this._el.id = 'weather-widget';
    this._el.className = 'widget weather-widget';
    this._el.innerHTML = `<div class="weather-loading">${I18n.t('weather.loading')}</div>`;
    sidebar.appendChild(this._el);
    zone.classList.add('active');
    zone.dataset.enabled = 'true';

    const cached = await this._readCache(settings);
    if (cached) {
      this._render(cached.temp, cached.code);
    } else {
      this._fetchAndRender(settings);
    }
    this._interval = setInterval(() => this._fetchAndRender(null), WEATHER_REFRESH_MS);
  },

  _render(temp, code) {
    if (!this._el) return;
    this._el.innerHTML = `
      <div class="weather-icon">${_wmoIcon(code)}</div>
      <div class="weather-temp">${Math.round(temp)}°</div>
    `;
  },

  async _readCache(settings) {
    try {
      const cached = await StorageLocal.get('weather_cache');
      if (!cached) return null;
      const city = settings.widgets?.weatherCity || 'Moscow';
      const unit = settings.widgets?.weatherUnit || 'metric';
      if (cached.city !== city || cached.unit !== unit) return null;
      if (Date.now() - cached.timestamp < WEATHER_REFRESH_MS) {
        return cached;
      }
      return null;
    } catch (e) {
      return null;
    }
  },

  async _writeCache(city, unit, temp, code) {
    try {
      await StorageLocal.set('weather_cache', {
        city: city,
        unit: unit,
        temp: temp,
        code: code,
        timestamp: Date.now()
      });
    } catch (e) {
      // Cache write failure is non-critical
    }
  },

  async _fetchAndRender(settings) {
    if (!settings) {
      settings = await StorageSync.get('settings') || getDefaultSettings();
    }
    const city = settings.widgets?.weatherCity || 'Moscow';
    const unit = settings.widgets?.weatherUnit || 'metric';

    const data = await this._fetchWeather(city, unit);
    if (!this._el) return;

    if (!data) {
      this._el.innerHTML = `<div class="weather-error">${I18n.t('weather.error')}</div>`;
      return;
    }

    this._render(data.temp, data.code);
    this._writeCache(city, unit, data.temp, data.code);
  },

  async _fetchWeather(city, unit) {
    return await WeatherProviders.fetchWeather(city, unit, I18n.getLang());
  },

  destroy() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }
    if (this._el) {
      this._el.remove();
      this._el = null;
    }
  }
};

function _insertHeadBarWidget(el, zone) {
  const headBar = document.getElementById('head-bar');
  const bm = document.getElementById('bookmarks-container');
  if (headBar && bm) {
    headBar.insertBefore(el, bm);
  } else {
    zone.appendChild(el);
  }
}

const QuotesWidget = {
  _interval: null,
  _el: null,

  async init() {
    const settings = await StorageSync.get('settings') || getDefaultSettings();
    const enabled = settings.widgets?.quotes !== false;
    const zone = document.getElementById('widgets-zone');
    if (!zone) return;

    if (!enabled) { this.destroy(); return; }

    this._el = document.createElement('div');
    this._el.id = 'quotes-widget';
    this._el.className = 'widget quotes-widget';
    this._el.innerHTML = `<div class="quotes-loading">${I18n.t('quotes.loading')}</div>`;
    _insertHeadBarWidget(this._el, zone);
    zone.classList.add('active');
    zone.dataset.enabled = 'true';

    const cached = await this._readCache();
    if (cached) {
      this._render(cached.text, cached.author);
    } else {
      await this._fetchAndRender();
    }

    this._interval = setInterval(() => this._fetchAndRender(), QuotesProviders.CACHE_TTL);
  },

  _render(text, author) {
    if (!this._el) return;
    const authorStr = author ? `\u2014 ${escapeHtml(author)}` : '';
    this._el.innerHTML = `<div class="quotes-bubble"><div class="quotes-text">${escapeHtml(text)}</div>${authorStr ? `<div class="quotes-author">${authorStr}</div>` : ''}</div>`;
  },

  async _readCache() {
    try {
      const cached = await StorageLocal.get('quotes_cache');
      if (!cached) return null;
      const lang = I18n.getLang();
      if (cached.lang !== lang) return null;
      if (cached._v !== QuotesProviders.CACHE_VERSION) return null;
      if (Date.now() - cached.timestamp < QuotesProviders.CACHE_TTL) {
        return cached;
      }
      return null;
    } catch (e) {
      return null;
    }
  },

  async _writeCache(text, author, lang) {
    try {
      await StorageLocal.set('quotes_cache', {
        _v: QuotesProviders.CACHE_VERSION,
        text: text,
        author: author,
        lang: lang,
        timestamp: Date.now()
      });
    } catch (e) {
      // Non-critical
    }
  },

  async _fetchAndRender() {
    const quote = await QuotesProviders.fetchQuote(I18n.getLang());
    if (!this._el) return;

    if (!quote) {
      this._el.innerHTML = `<div class="quotes-error">${I18n.t('quotes.error')}</div>`;
      return;
    }

    this._render(quote.text, quote.author);
    this._writeCache(quote.text, quote.author, quote.lang);
  },

  destroy() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }
    if (this._el) {
      this._el.remove();
      this._el = null;
    }
  }
};

WidgetSystem.register('quotes', QuotesWidget);
WidgetSystem.register('weather', WeatherWidget);
WidgetSystem.register('clock', ClockWidget);
