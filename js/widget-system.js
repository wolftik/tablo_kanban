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
      return;
    }

    const el = document.createElement('div');
    el.id = 'clock-widget';
    el.className = 'widget clock-widget';
    el.innerHTML = '<div class="clock-time">--:--</div><div class="clock-date">---</div>';
    zone.appendChild(el);
    zone.classList.add('active');
    zone.dataset.enabled = 'true';

    const update = () => {
      const now = new Date();
      const lang = I18n.getLang();
      const locale = I18n.localeToBCP47(lang);
      el.querySelector('.clock-time').textContent = now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
      el.querySelector('.clock-date').textContent = now.toLocaleDateString(locale, { day: 'numeric', month: 'long', weekday: 'short' });
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

WidgetSystem.register('clock', ClockWidget);

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

const WeatherWidget = {
  _interval: null,
  _el: null,

  async init() {
    const settings = await StorageSync.get('settings') || getDefaultSettings();
    const enabled = settings.widgets?.weather === true;
    const zone = document.getElementById('widgets-zone');
    if (!zone) return;

    if (!enabled) return;

    this._el = document.createElement('div');
    this._el.id = 'weather-widget';
    this._el.className = 'widget weather-widget';
    this._el.innerHTML = `<div class="weather-loading">${I18n.t('weather.loading')}</div>`;
    zone.prepend(this._el);
    zone.classList.add('active');
    zone.dataset.enabled = 'true';

    const cached = await this._readCache(settings);
    if (cached) {
      this._render(cached.temp, cached.code);
    } else {
      this._fetchAndRender(settings);
    }
    this._interval = setInterval(() => this._fetchAndRender(null), 3600000);
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
      if (Date.now() - cached.timestamp < 3600000) {
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

WidgetSystem.register('weather', WeatherWidget);

const CurrencyWidget = {
  _interval: null,
  _el: null,

  async init() {
    const settings = await StorageSync.get('settings') || getDefaultSettings();
    const enabled = settings.widgets?.currency === true;
    const zone = document.getElementById('widgets-zone');
    if (!zone) return;

    if (!enabled) return;

    this._el = document.createElement('div');
    this._el.id = 'currency-widget';
    this._el.className = 'widget currency-widget';
    this._el.innerHTML = '<div class="market-loading">' + I18n.t('currency.loading') + '</div>';
    zone.appendChild(this._el);
    zone.classList.add('active');
    zone.dataset.enabled = 'true';

    const cached = await this._readCache();
    if (cached) {
      this._render(cached.rates, cached.base, cached.previousRates);
    } else {
      this._fetchAndRender(settings);
    }
    this._interval = setInterval(() => this._fetchAndRender(null), 300000);
  },

  _render(rates, base, previousRates) {
    if (!this._el || !rates) {
      if (this._el) this._el.innerHTML = '<div class="market-error">' + I18n.t('currency.error') + '</div>';
      return;
    }
    const pairs = CurrencyProviders.filterPairs(base);
    let html = '';
    pairs.forEach(p => {
      const rate = CurrencyProviders.computeRate(rates, p.base, p.quote);
      const prevRate = previousRates ? CurrencyProviders.computeRate(previousRates, p.base, p.quote) : null;
      const change = CurrencyProviders.formatChange(rate, prevRate);
      const rateStr = CurrencyProviders.formatRate(rate);
      html += '<div class="market-row">';
      html += '<span class="market-pair">' + p.base + '/' + p.quote + '</span>';
      html += '<span class="market-rate">' + rateStr + '</span>';
      html += '<span class="market-change ' + change.sign + '">' + change.text + '</span>';
      html += '</div>';
    });
    this._el.innerHTML = '<div class="market-section-title">' + I18n.t('widgets.currency') + '</div>' + html;
  },

  async _readCache() {
    try {
      const cached = await StorageLocal.get('currency_cache');
      if (!cached) return null;
      if (Date.now() - cached.timestamp < 300000) {
        return cached;
      }
      return null;
    } catch (e) {
      return null;
    }
  },

  async _writeCache(rates, base, previousRates) {
    try {
      await StorageLocal.set('currency_cache', {
        rates: rates,
        base: base,
        previousRates: previousRates,
        timestamp: Date.now()
      });
    } catch (e) {
      // Non-critical
    }
  },

  async _fetchAndRender(settings) {
    if (!settings) {
      settings = await StorageSync.get('settings') || getDefaultSettings();
    }
    const base = settings.widgets?.currencyBase || 'USD';

    const previousCache = await this._readCache();
    const previousRates = previousCache ? previousCache.rates : null;

    const rates = await CurrencyProviders.fetchRates();
    if (!this._el) return;

    if (!rates) {
      this._el.innerHTML = '<div class="market-error">' + I18n.t('currency.error') + '</div>';
      return;
    }

    this._render(rates, base, previousRates);
    this._writeCache(rates, base, previousRates);
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

WidgetSystem.register('currency', CurrencyWidget);

const StocksWidget = {
  _interval: null,
  _el: null,

  async init() {
    const settings = await StorageSync.get('settings') || getDefaultSettings();
    const enabled = settings.widgets?.stocks === true;
    const zone = document.getElementById('widgets-zone');
    if (!zone) return;

    if (!enabled) return;

    this._el = document.createElement('div');
    this._el.id = 'stocks-widget';
    this._el.className = 'widget stocks-widget';
    this._el.innerHTML = '<div class="market-loading">' + I18n.t('stocks.loading') + '</div>';
    zone.appendChild(this._el);
    zone.classList.add('active');
    zone.dataset.enabled = 'true';

    const cached = await this._readCache();
    if (cached) {
      this._render(cached.indices);
    } else {
      this._fetchAndRender();
    }
    this._interval = setInterval(() => this._fetchAndRender(), 300000);
  },

  _render(indices) {
    if (!this._el || !indices || indices.length === 0) {
      if (this._el) this._el.innerHTML = '<div class="market-error">' + I18n.t('stocks.error') + '</div>';
      return;
    }
    let html = '<div class="market-section-title">' + I18n.t('widgets.stocks') + '</div>';
    indices.forEach(idx => {
      const priceStr = StockProviders.formatPrice(idx.price);
      const changeStr = StockProviders.formatChange(idx.change);
      const pctStr = StockProviders.formatChangePercent(idx.changePercent);
      const cls = StockProviders.getChangeClass(idx.change);
      html += '<div class="market-row">';
      html += '<span class="market-flag">' + idx.flag + '</span>';
      html += '<span class="market-label">' + idx.label + '</span>';
      html += '<span class="market-price">' + priceStr + '</span>';
      html += '<span class="market-change ' + cls + '">' + changeStr + ' (' + pctStr + ')</span>';
      html += '</div>';
    });
    this._el.innerHTML = html;
  },

  async _readCache() {
    try {
      const cached = await StorageLocal.get('stocks_cache');
      if (!cached) return null;
      if (Date.now() - cached.timestamp < 300000) {
        return cached;
      }
      return null;
    } catch (e) {
      return null;
    }
  },

  async _writeCache(indices) {
    try {
      await StorageLocal.set('stocks_cache', {
        indices: indices,
        timestamp: Date.now()
      });
    } catch (e) {
      // Non-critical
    }
  },

  async _fetchAndRender() {
    const indices = await StockProviders.fetchAllIndices();
    if (!this._el) return;

    if (!indices || indices.length === 0) {
      this._el.innerHTML = '<div class="market-error">' + I18n.t('stocks.error') + '</div>';
      return;
    }

    this._render(indices);
    this._writeCache(indices);
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

WidgetSystem.register('stocks', StocksWidget);
