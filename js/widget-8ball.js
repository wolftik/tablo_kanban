'use strict';

const EightBallWidget = (() => {
  let _btn = null;
  let _overlay = null;
  let _keyHandler = null;

  function _style() {
    const id = 'widget-8ball-style';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      .eightball-ball {
        width: 200px;
        height: 200px;
        border-radius: 50%;
        background: radial-gradient(circle at 35% 35%, #333, #000 70%);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        position: relative;
        flex-shrink: 0;
        box-shadow: 0 4px 20px rgba(0,0,0,0.4);
      }
      .eightball-window {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        background: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 32px;
        color: #1a237e;
        transition: opacity 0.2s ease;
        text-align: center;
        line-height: 1.2;
        padding: 4px;
        box-sizing: border-box;
        word-break: break-word;
      }
      .eightball-window.small-text {
        font-size: 16px;
      }
      .eightball-window.tiny-text {
        font-size: 13px;
      }
      .eightball-window.hidden {
        opacity: 0;
      }
      .eightball-answer {
        min-height: 40px;
        font-size: 14px;
        color: var(--bookmark-text, #334155);
        text-align: center;
        line-height: 1.5;
      }
      .eightball-ask-btn {
        padding: 8px 24px;
        border: none;
        border-radius: 8px;
        background: var(--accent-color, #3b82f6);
        color: #fff;
        font-size: 14px;
        cursor: pointer;
        transition: background 0.15s;
      }
      .eightball-ask-btn:hover {
        opacity: 0.85;
      }
      @keyframes shake {
        0%, 100% { transform: translateX(0) rotate(0deg); }
        10% { transform: translateX(-6px) rotate(-3deg); }
        20% { transform: translateX(6px) rotate(3deg); }
        30% { transform: translateX(-6px) rotate(-2deg); }
        40% { transform: translateX(6px) rotate(2deg); }
        50% { transform: translateX(-4px) rotate(-1deg); }
        60% { transform: translateX(4px) rotate(1deg); }
        70% { transform: translateX(-2px) rotate(0deg); }
        80% { transform: translateX(2px) rotate(0deg); }
        90% { transform: translateX(-1px) rotate(0deg); }
      }
      .eightball-ball.shaking {
        animation: shake 0.6s ease-in-out;
      }
    `;
    document.head.appendChild(style);
  }

  function _pickAnswer() {
    const index = Math.floor(Math.random() * 20);
    return I18n.t('8ball.answers.' + index);
  }

  function _shake(ballEl, windowEl, answerEl) {
    if (ballEl.classList.contains('shaking')) return;

    windowEl.classList.add('hidden');
    answerEl.textContent = '';
    ballEl.classList.add('shaking');

    setTimeout(() => {
      ballEl.classList.remove('shaking');
      const text = _pickAnswer();
      windowEl.textContent = text;
      windowEl.classList.remove('hidden', 'small-text', 'tiny-text');
      if (text.length > 20) {
        windowEl.classList.add('tiny-text');
      } else if (text.length > 10) {
        windowEl.classList.add('small-text');
      }
    }, 800);
  }

  function _showModal() {
    if (_overlay) return;

    const overlay = document.createElement('div');
    overlay.className = 'widget-modal-overlay';
    _overlay = overlay;

    const modal = document.createElement('div');
    modal.className = 'widget-modal';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'widget-modal-close';
    closeBtn.innerHTML = '&times;';
    modal.appendChild(closeBtn);

    const title = document.createElement('h3');
    title.textContent = I18n.t('8ball.title');
    modal.appendChild(title);

    const ballEl = document.createElement('div');
    ballEl.className = 'eightball-ball';

    const windowEl = document.createElement('div');
    windowEl.className = 'eightball-window';
    windowEl.textContent = '8';
    ballEl.appendChild(windowEl);

    modal.appendChild(ballEl);

    const answerEl = document.createElement('div');
    answerEl.className = 'eightball-answer';
    modal.appendChild(answerEl);

    const askBtn = document.createElement('button');
    askBtn.className = 'eightball-ask-btn';
    askBtn.textContent = I18n.t('8ball.ask');
    modal.appendChild(askBtn);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    requestAnimationFrame(() => overlay.classList.add('active'));

    const shakeAction = () => _shake(ballEl, windowEl, answerEl);
    askBtn.addEventListener('click', shakeAction);
    ballEl.addEventListener('click', shakeAction);

    const closeAction = () => {
      overlay.classList.remove('active');
      if (_keyHandler) {
        document.removeEventListener('keydown', _keyHandler);
        _keyHandler = null;
      }
      setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 200);
      _overlay = null;
    };

    closeBtn.addEventListener('click', closeAction);
    overlay.addEventListener('mousedown', (e) => {
      if (e.target === overlay) closeAction();
    });

    _keyHandler = (e) => {
      if (e.key === 'Escape') closeAction();
    };
    document.addEventListener('keydown', _keyHandler);
  }

  return {
    async init() {
      const settings = await StorageSync.get('settings') || getDefaultSettings();
      const enabled = settings.widgets?.eightball !== false;
      if (!enabled) return;

      const wrapper = document.getElementById('mini-widgets-group');
      if (!wrapper) return;

      _style();

      if (_btn) return;

      const btn = document.createElement('button');
      btn.className = 'mini-widget-btn';
      btn.dataset.i18nTitle = '8ball.title';
      btn.textContent = '\uD83D\uDD2E';
      btn.title = I18n.t('8ball.title');
      btn.addEventListener('click', _showModal);
      wrapper.appendChild(btn);
      _btn = btn;
    },

    destroy() {
      const styleEl = document.getElementById('widget-8ball-style');
      if (styleEl) styleEl.remove();
      if (_btn) {
        _btn.remove();
        _btn = null;
      }
      if (_overlay) {
        _overlay.remove();
        _overlay = null;
      }
      if (_keyHandler) {
        document.removeEventListener('keydown', _keyHandler);
        _keyHandler = null;
      }
    }
  };
})();

WidgetSystem.register('8ball', EightBallWidget);
