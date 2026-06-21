'use strict';

const WeatherProviders = (() => {
  const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
  const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
  const METNORWAY_URL = 'https://api.met.no/weatherapi/locationforecast/2.0/compact';
  const SEVENTIMER_URL = 'https://www.7timer.info/bin/api.pl';

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

  var SEVENTIMER_WMO_MAP = {
    'clear': 0,
    'pcloudy': 2,
    'mcloudy': 3,
    'cloudy': 4,
    'humid': 45,
    'lightrain': 61,
    'oshower': 80,
    'ishower': 80,
    'lightsnow': 71,
    'rain': 63,
    'snow': 73,
    'rainsnow': 67,
    'ts': 95,
    'tsrain': 95
  };

  function _seventimerWeatherToWMO(weather) {
    if (!weather) return 1;
    var base = weather.replace(/_(day|night)$/, '');
    return SEVENTIMER_WMO_MAP[base] || 1;
  }

  async function _geocode(city, lang) {
    try {
      var geoResp = await fetch(GEOCODING_URL + '?name=' + encodeURIComponent(city) + '&count=1&language=' + lang + '&format=json');
      if (!geoResp.ok) {
        console.warn('[WeatherProviders] Geocoding API error:', geoResp.status, geoResp.statusText);
        return null;
      }
      var geoJson = await geoResp.json();
      if (!geoJson.results || geoJson.results.length === 0) {
        console.warn('[WeatherProviders] City not found:', city);
        return null;
      }
      return { latitude: geoJson.results[0].latitude, longitude: geoJson.results[0].longitude };
    } catch (e) {
      console.warn('[WeatherProviders] Geocoding network error:', e);
      return null;
    }
  }

  async function _fetchOpenMeteo(lat, lon, unit) {
    var tempUnit = unit === 'imperial' ? 'fahrenheit' : 'celsius';
    try {
      var resp = await fetch(FORECAST_URL + '?latitude=' + lat + '&longitude=' + lon + '&current=temperature_2m,weather_code&temperature_unit=' + tempUnit);
      if (!resp.ok) {
        console.warn('[WeatherProviders] Open-Meteo forecast error:', resp.status);
        return null;
      }
      var json = await resp.json();
      return {
        temp: json.current.temperature_2m,
        code: json.current.weather_code,
        provider: 'open-meteo'
      };
    } catch (e) {
      console.warn('[WeatherProviders] Open-Meteo error:', e);
      return null;
    }
  }

  async function _fetchMetNorway(lat, lon, unit) {
    try {
      var resp = await fetch(METNORWAY_URL + '?lat=' + lat + '&lon=' + lon);
      if (!resp.ok) {
        console.warn('[WeatherProviders] MET Norway error:', resp.status);
        return null;
      }
      var json = await resp.json();
      var timeseries = json.properties && json.properties.timeseries;
      if (!timeseries || timeseries.length === 0) return null;

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
        code: _metNorwaySymbolToWMO(symbolCode),
        provider: 'met-norway'
      };
    } catch (e) {
      console.warn('[WeatherProviders] MET Norway error:', e);
      return null;
    }
  }

  async function _fetch7Timer(lat, lon, unit) {
    try {
      var resp = await fetch(SEVENTIMER_URL + '?lon=' + lon + '&lat=' + lat + '&product=civil&output=json');
      if (!resp.ok) {
        console.warn('[WeatherProviders] 7Timer error:', resp.status);
        return null;
      }
      var json = await resp.json();
      if (!json.dataseries || json.dataseries.length === 0) return null;

      var entry = json.dataseries[0];
      var temp = entry.temp2m;
      if (unit === 'imperial') {
        temp = temp * 9 / 5 + 32;
      }
      return {
        temp: temp,
        code: _seventimerWeatherToWMO(entry.weather),
        provider: '7timer'
      };
    } catch (e) {
      console.warn('[WeatherProviders] 7Timer error:', e);
      return null;
    }
  }

    async function _fetchWithTimeout(promiseFn, timeoutMs) {
    return await Promise.race([
      promiseFn(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), timeoutMs)
      )
    ]).catch(() => null);
  }

  async function fetchWeather(city, unit, lang) {
    var coords = await _geocode(city, lang);
    if (!coords) return null;

    var result = await _fetchWithTimeout(
        () => _fetchOpenMeteo(coords.latitude, coords.longitude, unit),
        3000
      ) || await _fetchWithTimeout(
        () => _fetchMetNorway(coords.latitude, coords.longitude, unit),
        3000
      ) || await _fetch7Timer(coords.latitude, coords.longitude, unit);

    if (result) {
      console.log('[WeatherProviders] Using provider:', result.provider);
    } else {
      console.warn('[WeatherProviders] All providers failed for:', city);
    }

    return result ? { temp: result.temp, code: result.code } : null;
  }

  return { fetchWeather: fetchWeather };
})();

