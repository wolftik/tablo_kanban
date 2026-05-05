'use strict';

const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

const WidgetSystem = (() => {
  const _widgets = new Map();
  let _initialized = false;

  function register(name, widget) {
    if (_widgets.has(name)) {
      console.warn(`Widget "${name}" already registered`);
      return;
    }
    _widgets.set(name, widget);
  }

  async function initAll() {
    if (_initialized) return;
    _initialized = true;

    for (const [name, widget] of _widgets) {
      try {
        if (widget.init) await widget.init();
      } catch (e) {
        console.error(`Widget "${name}" init error:`, e);
      }
    }
  }

  return { register, initAll };
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
      const locale = lang === 'ru' ? 'ru-RU' : lang === 'zh' ? 'zh-CN' : 'en-US';
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

    this._fetchAndRender(settings);
    this._interval = setInterval(() => this._fetchAndRender(null), 3600000);
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

    this._el.innerHTML = `
      <div class="weather-icon">${_wmoIcon(data.code)}</div>
      <div class="weather-temp">${Math.round(data.temp)}°</div>
    `;
  },

  async _fetchWeather(city, unit) {
    try {
      const geoResp = await fetch(`${GEOCODING_URL}?name=${encodeURIComponent(city)}&count=1&language=${I18n.getLang()}&format=json`);
      if (!geoResp.ok) return null;
      const geoJson = await geoResp.json();
      if (!geoJson.results || geoJson.results.length === 0) return null;

      const { latitude, longitude } = geoJson.results[0];

      const tempUnit = unit === 'imperial' ? 'fahrenheit' : 'celsius';
      const forecastResp = await fetch(`${FORECAST_URL}?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&temperature_unit=${tempUnit}`);
      if (!forecastResp.ok) return null;
      const forecastJson = await forecastResp.json();

      return {
        temp: forecastJson.current.temperature_2m,
        code: forecastJson.current.weather_code
      };
    } catch {
      return null;
    }
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
