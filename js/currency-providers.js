'use strict';

const CurrencyProviders = (() => {
  const API_URL = 'https://open.er-api.com/v6/latest/USD';

  const FIXED_PAIRS = [
    { base: 'USD', quote: 'RUB' },
    { base: 'EUR', quote: 'RUB' },
    { base: 'CNY', quote: 'RUB' },
    { base: 'USD', quote: 'CNY' },
    { base: 'EUR', quote: 'USD' }
  ];

  function _filterPairs(baseCurrency) {
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
        CNY: json.rates.CNY
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

  function formatChange(current, previous) {
    if (current == null || previous == null || previous === 0) return { text: '--', sign: '' };
    const diff = current - previous;
    const pct = (diff / previous) * 100;
    const sign = diff >= 0 ? '+' : '';
    return { text: sign + pct.toFixed(2) + '%', sign: diff >= 0 ? 'positive' : 'negative' };
  }

  return { fetchRates, computeRate, formatRate, formatChange, filterPairs: _filterPairs, FIXED_PAIRS: FIXED_PAIRS };
})();
