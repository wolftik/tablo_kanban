'use strict';

const StockProviders = (() => {
  const BASE_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';
  const MOEX_URL = 'https://iss.moex.com/iss/engines/stock/markets/index/securities/IMOEX.json?iss.meta=off';

  const INDICES = [
    { symbol: '^GSPC', flag: '\uD83C\uDDFA\uD83C\uDDF8', label: 'S&P 500' },
    { symbol: 'IMOEX.ME', flag: '\uD83C\uDDF7\uD83C\uDDFA', label: 'MOEX' },
    { symbol: '000001.SS', flag: '\uD83C\uDDE8\uD83C\uDDF3', label: 'SSE' },
    { symbol: '^STOXX50E', flag: '\uD83C\uDDEA\uD83C\uDDFA', label: 'EURO STOXX 50' },
    { symbol: '^N225', flag: '\uD83C\uDDEF\uD83C\uDDF5', label: 'Nikkei 225' },
    { symbol: 'GC=F', flag: '\uD83E\uDD47', label: 'Gold' },
    { symbol: 'SI=F', flag: '\uD83E\uDD48', label: 'Silver' },
    { symbol: 'BZ=F', flag: '\uD83D\uDEE2\uFE0F', label: 'Brent' }
  ];

  async function fetchMOEX() {
    try {
      const resp = await fetch(MOEX_URL);
      if (!resp.ok) {
        console.warn('[StockProviders] MOEX API error:', resp.status);
        return null;
      }
      const json = await resp.json();
      const md = json.marketdata;
      if (!md || !md.data || md.data.length === 0) return null;

      const row = md.data[0];
      const col = {};
      md.columns.forEach((c, i) => { col[c] = i; });

      const current = parseFloat(row[col['CURRENTVALUE']]);
      const prevClose = parseFloat(row[col['LASTVALUE']]);
      if (isNaN(current) || isNaN(prevClose) || prevClose === 0) return null;

      return {
        symbol: 'IMOEX.ME',
        price: current,
        change: current - prevClose,
        changePercent: ((current - prevClose) / prevClose) * 100
      };
    } catch (e) {
      console.warn('[StockProviders] MOEX API error:', e);
      return null;
    }
  }

  async function fetchYahooViaSW(symbol) {
    const url = BASE_URL + '/' + encodeURIComponent(symbol) + '?interval=1d&range=1d';
    return new Promise(resolve => {
      chrome.runtime.sendMessage({ type: 'FETCH_JSON', url }, response => {
        if (!response || !response.ok || !response.data) {
          console.warn('[StockProviders] Yahoo Finance proxy error for', symbol, ':', response?.error || 'no response');
          resolve(null);
          return;
        }
        const json = response.data;
        const result = json.chart?.result?.[0];
        if (!result) { resolve(null); return; }

        const meta = result.meta;
        const closes = result.indicators?.quote?.[0]?.close;
        if (!meta || meta.regularMarketPrice == null || !closes || closes.length === 0) { resolve(null); return; }

        const current = meta.regularMarketPrice;
        const previous = meta.chartPreviousClose || (closes.length >= 2 ? closes[closes.length - 2] : current);
        resolve({
          symbol: symbol,
          price: current,
          change: current - previous,
          changePercent: ((current - previous) / previous) * 100
        });
      });
    });
  }

  async function fetchIndex(symbol) {
    if (symbol === 'IMOEX.ME') {
      return fetchMOEX();
    }
    return fetchYahooViaSW(symbol);
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
    const sign = value > 0 ? '+' : '';
    return sign + value.toFixed(2);
  }

  function formatChangePercent(value) {
    if (value == null) return '--';
    const sign = value > 0 ? '+' : '';
    return sign + value.toFixed(2) + '%';
  }

  function getChangeClass(value) {
    if (value == null) return '';
    if (value === 0) return 'neutral';
    return value > 0 ? 'positive' : 'negative';
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
