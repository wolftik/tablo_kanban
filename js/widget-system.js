'use strict';

const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const METNORWAY_URL = 'https://api.met.no/weatherapi/locationforecast/2.0/compact';

const METNORWAY_WMO_MAP = {
  'clearsky': 0,
  'fair': 1,
  'partlycloudy': 2,
  'cloudy': 3,
  'fog': 45,
  'fog_patches': 48,
  'lightdrizzle': 51,
  'drizzle': 53,
  'heavydrizzle': 55,
  'lightfreezingdrizzle': 56,
  'freezingdrizzle': 57,
  'lightrain': 61,
  'rain': 63,
  'heavyrain': 65,
  'lightfreezingrain': 66,
  'freezingrain': 67,
  'lightsleet': 71,
  'sleet': 73,
  'heavysleet': 75,
  'lightsnow': 71,
  'snow': 73,
  'heavysnow': 75,
  'lightrainshowers': 80,
  'rainshowers': 81,
  'heavyrainshowers': 82,
  'lightsleetshowers': 85,
  'sleetshowers': 86,
  'heavysleetshowers': 86,
  'lightsnowshowers': 85,
  'snowshowers': 86,
  'heavysnowshowers': 86,
  'thunder': 95,
  'rainandthunder': 95,
  'sleetandthunder': 96,
  'snowandthunder': 99,
  'rainshowersandthunder': 95,
  'sleetshowersandthunder': 96,
  'snowshowersandthunder': 99
};

function _metNorwaySymbolToWMO(symbol) {
  if (!symbol) return 1;
  var base = symbol.replace(/_(day|night)$/, '');
  return METNORWAY_WMO_MAP[base] || 1;
}

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
      if (!geoResp.ok) {
        console.warn('[WeatherWidget] Geocoding API error:', geoResp.status, geoResp.statusText);
        return null;
      }
      const geoJson = await geoResp.json();
      if (!geoJson.results || geoJson.results.length === 0) {
        console.warn('[WeatherWidget] City not found:', city);
        return null;
      }

      const { latitude, longitude } = geoJson.results[0];

      // Try primary: Open-Meteo forecast
      const tempUnit = unit === 'imperial' ? 'fahrenheit' : 'celsius';
      try {
        const forecastResp = await fetch(`${FORECAST_URL}?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&temperature_unit=${tempUnit}`);
        if (forecastResp.ok) {
          const forecastJson = await forecastResp.json();
          return {
            temp: forecastJson.current.temperature_2m,
            code: forecastJson.current.weather_code
          };
        }
        console.warn('[WeatherWidget] Open-Meteo forecast error:', forecastResp.status);
      } catch (e) {
        console.warn('[WeatherWidget] Open-Meteo forecast error:', e);
      }

      // Fallback: MET Norway
      try {
        const metResp = await fetch(`${METNORWAY_URL}?lat=${latitude}&lon=${longitude}`);
        if (metResp.ok) {
          const metJson = await metResp.json();
          var timeseries = metJson.properties && metJson.properties.timeseries;
          if (timeseries && timeseries.length > 0) {
            var current = timeseries[0].data.instant.details;
            var next1h = timeseries[0].data.next_1_hours;
            var next6h = timeseries[0].data.next_6_hours;
            var next12h = timeseries[0].data.next_12_hours;
            var symbolCode = (next1h && next1h.summary && next1h.summary.symbol_code) ||
                             (next6h && next6h.summary && next6h.summary.symbol_code) ||
                             (next12h && next12h.summary && next12h.summary.symbol_code) ||
                             'cloudy';
            var temp = current.air_temperature;
            if (unit === 'imperial') {
              temp = temp * 9 / 5 + 32;
            }
            return {
              temp: temp,
              code: _metNorwaySymbolToWMO(symbolCode)
            };
          }
        }
        console.warn('[WeatherWidget] MET Norway error:', metResp.status);
      } catch (e) {
        console.warn('[WeatherWidget] MET Norway error:', e);
      }

      return null;
    } catch (e) {
      console.warn('[WeatherWidget] Network error fetching weather:', e);
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
