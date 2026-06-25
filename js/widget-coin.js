'use strict';

const CoinWidget = (() => {
  let _btn = null;
  let _coinEl = null;
  let _styleEl = null;
  let _dismissTimer = null;
  let _flipping = false;

  const COIN_SIZE = 140;
  const FLIP_DURATION = 2000;
  const DISMISS_DELAY_MS = 750;

  const CSS = `
    #coin-flip-container {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      opacity: 0;
      transform: scale(0.6);
      transition: opacity 0.3s ease, transform 0.3s ease;
    }
    #coin-flip-container.active {
      opacity: 1;
      transform: scale(1);
      pointer-events: auto;
    }
    #coin-flip-container.fade-out {
      opacity: 0;
      transform: scale(0.6);
      transition: opacity 0.25s ease, transform 0.25s ease;
    }
    #coin-flip-coin {
      width: ${COIN_SIZE}px;
      height: ${COIN_SIZE}px;
      perspective: 500px;
      cursor: pointer;
    }
    #coin-flip-coin-inner {
      width: 100%;
      height: 100%;
      position: relative;
      transform-style: preserve-3d;
      transition: transform ${FLIP_DURATION}ms cubic-bezier(0.22, 1, 0.36, 1);
    }
    .coin-face {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      backface-visibility: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
      border: 3px solid #b8860b;
      background: conic-gradient(from 90deg, #b8860b, #ffd700, #daa520, #ffd700, #b8860b);
      box-shadow:
        0 0 40px rgba(255, 215, 0, 0.25),
        inset 0 0 30px rgba(139, 105, 20, 0.3);
      overflow: hidden;
    }
    .coin-face::before {
      content: '';
      position: absolute;
      inset: 8px;
      border-radius: 50%;
      border: 2px solid rgba(255, 215, 0, 0.4);
      pointer-events: none;
    }
    .coin-face::after {
      content: '';
      position: absolute;
      inset: 14px;
      border-radius: 50%;
      border: 1px solid rgba(255, 215, 0, 0.25);
      pointer-events: none;
    }
    .coin-shine {
      position: absolute;
      top: -20%;
      left: -20%;
      width: 70%;
      height: 70%;
      border-radius: 50%;
      background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 70%);
      pointer-events: none;
      z-index: 2;
    }
    .coin-emoji {
      font-size: 52px;
      line-height: 1;
      position: relative;
      z-index: 1;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
    }
    .coin-label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 2.5px;
      color: #7a5c00;
      text-transform: uppercase;
      margin-top: 5px;
      position: relative;
      z-index: 1;
    }
    .coin-face-back {
      transform: rotateY(180deg);
    }
  `;

  function _addStyles() {
    if (document.getElementById('coin-widget-style')) return;
    _styleEl = document.createElement('style');
    _styleEl.id = 'coin-widget-style';
    _styleEl.textContent = CSS;
    document.head.appendChild(_styleEl);
  }

  function _removeStyles() {
    if (_styleEl) {
      _styleEl.remove();
      _styleEl = null;
    }
  }

  function _dismiss() {
    const container = document.getElementById('coin-flip-container');
    if (!container) return;
    if (_keyHandler) {
      document.removeEventListener('keydown', _keyHandler);
    }
    container.classList.remove('active');
    container.classList.add('fade-out');
    if (_dismissTimer) {
      clearTimeout(_dismissTimer);
      _dismissTimer = null;
    }
    setTimeout(() => {
      if (container.parentNode) container.remove();
    }, 300);
    _coinEl = null;
    _flipping = false;
  }

  function _onCoinClick() {
    if (_flipping) return;
    _dismiss();
  }

  function _onTransitionEnd(e) {
    if (e.propertyName !== 'transform') return;
    _flipping = false;
    _dismissTimer = setTimeout(_dismiss, DISMISS_DELAY_MS);
  }

  function _doFlip(inner) {
    const isHeads = Math.random() < 0.5;
    const extraDeg = isHeads ? 0 : 180;
    inner.style.transition = 'none';
    inner.style.transform = 'rotateY(0deg)';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        inner.style.transition = 'transform ' + FLIP_DURATION + 'ms cubic-bezier(0.22, 1, 0.36, 1)';
        inner.style.transform = 'rotateY(' + (1800 + extraDeg) + 'deg)';
      });
    });
  }

  function _showCoin() {
    if (document.getElementById('coin-flip-container')) return;
    const container = document.createElement('div');
    container.id = 'coin-flip-container';

    const coinWrap = document.createElement('div');
    coinWrap.id = 'coin-flip-coin';

    const inner = document.createElement('div');
    inner.id = 'coin-flip-coin-inner';

    function _createFace(emoji, labelText, isBack) {
      const face = document.createElement('div');
      face.className = 'coin-face' + (isBack ? ' coin-face-back' : '');
      const shine = document.createElement('div');
      shine.className = 'coin-shine';
      face.appendChild(shine);
      const emojiEl = document.createElement('div');
      emojiEl.className = 'coin-emoji';
      emojiEl.textContent = emoji;
      face.appendChild(emojiEl);
      const label = document.createElement('div');
      label.className = 'coin-label';
      label.textContent = labelText;
      face.appendChild(label);
      return face;
    }

    const front = _createFace('\u2600\uFE0F', I18n.t('coin.heads'), false);
    const back = _createFace('\uD83C\uDF19', I18n.t('coin.tails'), true);

    inner.appendChild(front);
    inner.appendChild(back);
    coinWrap.appendChild(inner);

    container.appendChild(coinWrap);
    document.body.appendChild(container);

    _coinEl = coinWrap;
    _flipping = true;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        container.classList.add('active');
        _doFlip(inner);
      });
    });

    inner.addEventListener('transitionend', _onTransitionEnd);
    coinWrap.addEventListener('click', _onCoinClick);

    _keyHandler = function (e) {
      if (e.key === 'Escape') {
        if (_flipping) return;
        _dismiss();
      }
    };
    document.addEventListener('keydown', _keyHandler);
  }

  let _keyHandler = null;

  async function init() {
    const settings = await StorageSync.get('settings') || getDefaultSettings();
    const enabled = settings.widgets?.coin !== false;
    if (!enabled) { destroy(); return; }

    _addStyles();

    const wrapper = document.getElementById('mini-widgets-group');
    if (!wrapper) { console.warn('[Coin] mini-widgets-group not found'); return; }

    if (_btn) return;

    _btn = document.createElement('button');
    _btn.className = 'mini-widget-btn';
    _btn.dataset.i18nTitle = 'coin.title';
    _btn.title = I18n.t('coin.title');
    _btn.textContent = '\uD83E\uDE99';
    _btn.addEventListener('click', _showCoin);
    wrapper.appendChild(_btn);
  }

  function destroy() {
    _dismiss();
    if (_keyHandler) {
      document.removeEventListener('keydown', _keyHandler);
      _keyHandler = null;
    }
    _removeStyles();
    if (_btn) {
      _btn.remove();
      _btn = null;
    }
  }

  return { init: init, destroy: destroy };
})();

WidgetSystem.register('coin', CoinWidget);
