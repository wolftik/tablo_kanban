'use strict';

const CurrencyProviders = (() => {
  const API_URL = 'https://open.er-api.com/v6/latest/USD';

  const FIXED_PAIRS = [
    { base: 'USD', quote: 'RUB' },
    { base: 'EUR', quote: 'RUB' },
    { base: 'CNY', quote: 'RUB' },
    { base: 'USD', quote: 'CNY' },
    { base: 'EUR', quote: 'USD' },
    { base: 'EUR', quote: 'CNY' },
    { base: 'USD', quote: 'JPY' },
    { base: 'EUR', quote: 'JPY' },
    { base: 'RUB', quote: 'JPY' }
  ];

  function filterPairs(baseCurrency) {
    if (baseCurrency === 'ALL') return FIXED_PAIRS;
    return FIXED_PAIRS.filter(p => p.base === baseCurrency || p.quote === baseCurrency);
  }

  async function fetchRates() {
    try {
      const resp = await fetch(API_URL);
      if (!resp.ok) {
        console.warn('[CurrencyProviders] API error:', resp.status);
        return null;
      }
      const json = await resp.json();
      if (!json.rates) return null;
      return {
        USD: 1,
        RUB: json.rates.RUB,
        EUR: json.rates.EUR,
        CNY: json.rates.CNY,
        JPY: json.rates.JPY
      };
    } catch (e) {
      console.warn('[CurrencyProviders] Network error:', e);
      return null;
    }
  }

  function computeRate(rates, base, quote) {
    if (!rates[base] || !rates[quote]) return null;
    return rates[quote] / rates[base];
  }

  function formatRate(value) {
    if (value == null) return '---';
    if (value >= 100) return value.toFixed(2);
    if (value >= 10) return value.toFixed(3);
    if (value >= 1) return value.toFixed(4);
    return value.toFixed(5);
  }

  return { fetchRates, computeRate, formatRate, filterPairs };
})();
