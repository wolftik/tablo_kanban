'use strict';

const StockProviders = (() => {
  const BASE_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';

  const INDICES = [
    { symbol: '^GSPC', flag: '\uD83C\uDDFA\uD83C\uDDF8', label: 'S&P 500' },
    { symbol: 'IMOEX.ME', flag: '\uD83C\uDDF7\uD83C\uDDFA', label: 'MOEX' },
    { symbol: '000001.SS', flag: '\uD83C\uDDE8\uD83C\uDDF3', label: 'SSE' },
    { symbol: '^STOXX50E', flag: '\uD83C\uDDEA\uD83C\uDDFA', label: 'EURO STOXX 50' }
  ];

  async function fetchIndex(symbol) {
    try {
      const url = BASE_URL + '/' + encodeURIComponent(symbol) + '?interval=1d&range=1d';
      const resp = await fetch(url);
      if (!resp.ok) {
        console.warn('[StockProviders] Yahoo Finance error for', symbol, ':', resp.status);
        return null;
      }
      const json = await resp.json();
      const result = json.chart?.result?.[0];
      if (!result) return null;

      const meta = result.meta;
      const closes = result.indicators?.quote?.[0]?.close;
      if (!meta || !closes || closes.length < 2) return null;

      const current = meta.regularMarketPrice;
      const previous = meta.previousClose || closes[closes.length - 2];
      const change = current - previous;
      const changePercent = (change / previous) * 100;

      return {
        symbol: symbol,
        price: current,
        change: change,
        changePercent: changePercent
      };
    } catch (e) {
      console.warn('[StockProviders] Network error for', symbol, ':', e);
      return null;
    }
  }

  async function fetchAllIndices() {
    const results = await Promise.allSettled(INDICES.map(idx => fetchIndex(idx.symbol)));
    const output = [];
    results.forEach((res, i) => {
      if (res.status === 'fulfilled' && res.value) {
        output.push({
          ...INDICES[i],
          ...res.value
        });
      }
    });
    return output;
  }

  function getIndexList() {
    return INDICES;
  }

  function formatPrice(price) {
    if (price == null) return '---';
    if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return price.toFixed(2);
  }

  function formatChange(value) {
    if (value == null) return '--';
    const sign = value >= 0 ? '+' : '';
    return sign + value.toFixed(2);
  }

  function formatChangePercent(value) {
    if (value == null) return '--';
    const sign = value >= 0 ? '+' : '';
    return sign + value.toFixed(2) + '%';
  }

  function getChangeClass(value) {
    if (value == null) return '';
    return value >= 0 ? 'positive' : 'negative';
  }

  return {
    fetchAllIndices,
    fetchIndex,
    getIndexList,
    formatPrice,
    formatChange,
    formatChangePercent,
    getChangeClass
  };
})();
