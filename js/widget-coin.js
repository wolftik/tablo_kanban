'use strict';

const CoinWidget = (() => {
  let _btn = null;
  let _overlay = null;
  let _coinInner = null;
  let _resultText = null;
  let _flipBtn = null;
  let _styleEl = null;
  let _keyHandler = null;
  let _flipping = false;
  let _lastResult = null;

  async function init() {
    const settings = await StorageSync.get('settings') || getDefaultSettings();
    const enabled = settings.widgets?.coin !== false;
    if (!enabled) return;

    const css = `
      .coin-flip-container {
        width: 120px;
        height: 120px;
        perspective: 400px;
      }
      .coin-flip-inner {
        width: 100%;
        height: 100%;
        position: relative;
        transform-style: preserve-3d;
        transition: transform 1.8s ease-out;
      }
      .coin-flip-front,
      .coin-flip-back {
        position: absolute;
        inset: 0;
        border-radius: 50%;
        backface-visibility: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 48px;
        background: linear-gradient(135deg, #f59e0b, #d97706);
        color: #fff;
        border: 2px solid #b45309;
        box-shadow: 0 4px 16px rgba(0,0,0,0.2);
      }
      .coin-flip-back {
        transform: rotateY(180deg);
      }
      .coin-result {
        font-size: 16px;
        font-weight: 600;
        color: var(--bookmark-text);
        min-height: 24px;
        text-align: center;
      }
    `;
    _styleEl = document.createElement('style');
    _styleEl.textContent = css;
    document.head.appendChild(_styleEl);

    const wrapper = document.getElementById('mini-widgets-group');
    if (!wrapper) return;

    _btn = document.createElement('button');
    _btn.className = 'mini-widget-btn';
    _btn.dataset.i18nTitle = 'coin.title';
    _btn.title = I18n.t('coin.title');
    _btn.textContent = '\uD83E\uDE99';
    wrapper.appendChild(_btn);

    _overlay = document.createElement('div');
    _overlay.className = 'widget-modal-overlay';
    _overlay.innerHTML = [
      '<div class="widget-modal" style="position:relative">',
      '<button class="widget-modal-close">&times;</button>',
      '<h3>' + I18n.t('coin.title') + '</h3>',
      '<div class="coin-flip-container"><div class="coin-flip-inner"><div class="coin-flip-front">?</div><div class="coin-flip-back">\uD83E\uDE99</div></div></div>',
      '<div class="coin-result" style="display:none"></div>',
      '<button class="mini-widget-btn" style="width:auto;padding:8px 24px;font-size:14px;border-radius:8px">' + I18n.t('coin.flip') + '</button>',
      '</div>'
    ].join('');
    document.body.appendChild(_overlay);

    _coinInner = _overlay.querySelector('.coin-flip-inner');
    _resultText = _overlay.querySelector('.coin-result');
    _flipBtn = _overlay.querySelector('.widget-modal .mini-widget-btn');

    const closeBtn = _overlay.querySelector('.widget-modal-close');

    _flipBtn.addEventListener('click', _doFlip);
    _coinInner.addEventListener('transitionend', _onTransitionEnd);
    closeBtn.addEventListener('click', _close);
    _overlay.addEventListener('click', function (e) {
      if (e.target === _overlay) _close();
    });

    _btn.addEventListener('click', _show);

    _keyHandler = function (e) {
      if (e.key === 'Escape') _close();
    };
    document.addEventListener('keydown', _keyHandler);
  }

  function _show() {
    if (!_overlay) return;
    _overlay.style.display = '';
    _overlay.classList.add('active');
    _coinInner.style.transition = 'none';
    _coinInner.style.transform = 'rotateY(0deg)';
    _resultText.style.display = 'none';
    _flipping = false;
  }

  function _doFlip() {
    if (_flipping) return;
    _flipping = true;
    _resultText.style.display = 'none';
    _lastResult = Math.random() < 0.5;
    const extraDeg = _lastResult ? 0 : 180;
    _coinInner.style.transition = 'transform 1.8s ease-out';
    _coinInner.style.transform = 'rotateY(' + (3600 + extraDeg) + 'deg)';
  }

  function _onTransitionEnd(e) {
    if (e.propertyName !== 'transform') return;
    _flipping = false;
    _coinInner.style.transition = 'none';
    _resultText.style.display = '';
    _resultText.textContent = I18n.t(_lastResult ? 'coin.heads' : 'coin.tails');
  }

  function _close() {
    if (!_overlay) return;
    _overlay.style.display = 'none';
    _overlay.classList.remove('active');
    _coinInner.style.transition = 'none';
    _coinInner.style.transform = 'rotateY(0deg)';
    _resultText.style.display = 'none';
    _flipping = false;
  }

  function destroy() {
    if (_keyHandler) {
      document.removeEventListener('keydown', _keyHandler);
      _keyHandler = null;
    }
    if (_styleEl) { _styleEl.remove(); _styleEl = null; }
    if (_btn) { _btn.remove(); _btn = null; }
    if (_overlay) { _overlay.remove(); _overlay = null; }
    _coinInner = null;
    _resultText = null;
    _flipBtn = null;
  }

  return { init: init, destroy: destroy };
})();

WidgetSystem.register('coin', CoinWidget);
