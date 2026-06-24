'use strict';

const EightBallWidget = (() => {
  let _btn = null;
  let _container = null;
  let _ballEl = null;
  let _windowEl = null;
  let _numberEl = null;
  let _cubeEl = null;
  let _floatWrapper = null;
  let _cubeContainer = null;
  let _cubeFaceTexts = null;
  let _closeBtn = null;
  let _keyHandler = null;
  let _onMouseMove = null;
  let _onMouseLeave = null;
  let _shaking = false;
  let _revealed = false;

  const BALL_SIZE = 280;
  const SHAKE_DURATION = 800;
  const INITIAL_WINDOW = 100;
  const EXPANDED_WINDOW = 170;
  const CUBE_SIDE = 90;
  const CUBE_HALF = CUBE_SIDE / 2;

  const CSS = `
    #eightball-container {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      opacity: 0;
      transform: scale(0.6);
      will-change: transform, opacity;
      transition: opacity 0.3s ease, transform 0.3s ease;
    }
    #eightball-container.active {
      opacity: 1;
      transform: scale(1);
      pointer-events: auto;
    }
    #eightball-container.fade-out {
      opacity: 0;
      transform: scale(0.6);
      transition: opacity 0.25s ease, transform 0.25s ease;
    }
    #eightball-close {
      position: absolute;
      top: -10px;
      right: -10px;
      width: 40px;
      height: 40px;
      border: none;
      background: rgba(0,0,0,0.45);
      color: rgba(255,255,255,0.7);
      font-size: 22px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s, color 0.15s;
      z-index: 4;
      line-height: 1;
      font-family: inherit;
      padding: 0;
    }
    #eightball-close:hover {
      background: rgba(0,0,0,0.65);
      color: #fff;
    }
    #eightball-ball {
      width: ${BALL_SIZE}px;
      height: ${BALL_SIZE}px;
      border-radius: 50%;
      background: radial-gradient(circle at 32% 28%, #4d4d4d, #181818 50%, #000 80%);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      position: relative;
      box-shadow:
        0 12px 50px rgba(0,0,0,0.55),
        inset 0 -35px 60px rgba(0,0,0,0.7),
        inset 0 15px 40px rgba(255,255,255,0.05);
      flex-shrink: 0;
      user-select: none;
    }
    .eightball-window {
      width: ${INITIAL_WINDOW}px;
      height: ${INITIAL_WINDOW}px;
      border-radius: 50%;
      background: linear-gradient(135deg, #ffffff, #dfe3e8);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      z-index: 2;
      perspective: 250px;
      transition: width 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), height 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.5s ease;
      overflow: hidden;
      box-shadow:
        0 2px 14px rgba(0,0,0,0.25),
        inset 0 1px 4px rgba(255,255,255,0.5);
    }
    .eightball-window.expanded {
      width: ${EXPANDED_WINDOW}px;
      height: ${EXPANDED_WINDOW}px;
      background: linear-gradient(180deg, #a8b0c0 0%, #788299 45%, #5b6579 100%);
      box-shadow:
        0 2px 14px rgba(0,0,0,0.3),
        inset 0 1px 8px rgba(255,255,255,0.12);
    }
    .eightball-window.expanded::after {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      border-radius: 50%;
      background:
        radial-gradient(ellipse at 50% 25%, rgba(255,255,255,0.08) 0%, transparent 55%),
        radial-gradient(ellipse at 50% 50%, transparent 38%, rgba(255,255,255,0.04) 40%, transparent 42%),
        radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(255,255,255,0.03) 58%, transparent 61%);
      pointer-events: none;
      animation: water-ripple 4s ease-in-out infinite;
      z-index: 0;
    }
    @keyframes water-ripple {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    .eightball-number {
      font-size: 54px;
      font-weight: 700;
      color: #1a237e;
      line-height: 1;
      transition: opacity 0.25s ease, transform 0.25s ease;
      position: absolute;
      pointer-events: none;
    }
    .eightball-number.fade {
      opacity: 0;
      transform: scale(0.3);
    }
    .eightball-cube-container {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      transform-style: preserve-3d;
      will-change: transform;
      transition: transform 0.2s ease-out;
      z-index: 1;
    }
    .eightball-float-wrapper {
      transform-style: preserve-3d;
      animation: cube-float 3.5s ease-in-out infinite;
    }
    .eightball-cube {
      width: ${CUBE_SIDE}px;
      height: ${CUBE_SIDE}px;
      position: relative;
      transform-style: preserve-3d;
      opacity: 0;
      transform: scale(0.35);
      transition: opacity 0.35s ease 0.05s, transform 0.35s ease 0.05s;
      background: #101010;
    }
    .eightball-cube.visible {
      opacity: 1;
      transform: scale(1);
    }
    .eightball-cube.hiding {
      opacity: 0;
      transform: scale(0.35);
      transition: opacity 0.12s ease, transform 0.12s ease;
    }
    .eightball-cube-face {
      position: absolute;
      inset: 0;
      backface-visibility: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .eightball-cube-face::before {
      content: '';
      position: absolute;
      inset: 3px;
      border: 1px solid rgba(180,180,180,0.4);
      pointer-events: none;
      z-index: 1;
    }
    .eightball-cube-face::after {
      content: '';
      position: absolute;
      top: 0; left: 5%; right: 5%;
      height: 40%;
      background: linear-gradient(180deg, rgba(255,255,255,0.07) 0%, transparent 100%);
      pointer-events: none;
      z-index: 1;
    }
    .eightball-cube-face.f0 {
      background: linear-gradient(135deg, #555, #1a1a1a);
      transform: translateZ(${CUBE_HALF}px);
    }
    .eightball-cube-face.f1 {
      background: linear-gradient(135deg, #484848, #161616);
      transform: rotateY(90deg) translateZ(${CUBE_HALF}px);
    }
    .eightball-cube-face.f2 {
      background: linear-gradient(135deg, #4e4e4e, #181818);
      transform: rotateY(180deg) translateZ(${CUBE_HALF}px);
    }
    .eightball-cube-face.f3 {
      background: linear-gradient(135deg, #434343, #131313);
      transform: rotateY(270deg) translateZ(${CUBE_HALF}px);
    }
    .eightball-cube-face.f4 {
      background: linear-gradient(135deg, #515151, #1c1c1c);
      transform: rotateX(90deg) translateZ(${CUBE_HALF}px);
    }
    .eightball-cube-face.f5 {
      background: linear-gradient(135deg, #464646, #141414);
      transform: rotateX(-90deg) translateZ(${CUBE_HALF}px);
    }
    .eightball-cube-fill {
      position: absolute;
      inset: 0;
      background: #0d0d0d;
      transform: scale(0.88);
    }
    .eightball-cube-text {
      font-size: 13px;
      font-weight: 600;
      color: #d0d0d0;
      text-align: center;
      line-height: 1.4;
      word-break: break-word;
      position: relative;
      z-index: 2;
      text-shadow: 0 1px 3px rgba(0,0,0,0.5);
      padding: 4px 8px;
      opacity: 0;
      transition: opacity 0.4s ease 0.15s;
    }
    .eightball-cube-text.shown {
      opacity: 1;
    }
    .eightball-cube-text.small-text {
      font-size: 11px;
    }
    .eightball-cube-text.tiny-text {
      font-size: 10px;
    }
    @keyframes cube-float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-6px); }
    }
    @keyframes shake {
      0%, 100% { transform: translateX(0) rotate(0deg); }
      10% { transform: translateX(-8px) rotate(-4deg); }
      20% { transform: translateX(8px) rotate(4deg); }
      30% { transform: translateX(-8px) rotate(-3deg); }
      40% { transform: translateX(8px) rotate(3deg); }
      50% { transform: translateX(-6px) rotate(-2deg); }
      60% { transform: translateX(6px) rotate(2deg); }
      70% { transform: translateX(-4px) rotate(-1deg); }
      80% { transform: translateX(4px) rotate(1deg); }
      90% { transform: translateX(-2px) rotate(0deg); }
    }
    #eightball-ball.shaking {
      animation: shake 0.6s ease-in-out;
    }
  `;

  function _addStyles() {
    if (document.getElementById('widget-8ball-style')) return;
    var style = document.createElement('style');
    style.id = 'widget-8ball-style';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  function _removeStyles() {
    var el = document.getElementById('widget-8ball-style');
    if (el) el.remove();
  }

  function _pickAnswer() {
    return I18n.t('8ball.answers.' + Math.floor(Math.random() * 20));
  }

  function _showAnswer(text) {
    if (!_cubeFaceTexts) return;
    _cubeFaceTexts.forEach(function (el) {
      el.textContent = '';
      el.classList.remove('shown', 'small-text', 'tiny-text');
    });
    var target = _cubeFaceTexts[0];
    target.textContent = text;
    if (text.length > 18) target.classList.add('tiny-text');
    else if (text.length > 10) target.classList.add('small-text');
    _cubeEl.classList.remove('hiding');
    _cubeEl.classList.add('visible');
    requestAnimationFrame(function () { target.classList.add('shown'); });
  }

  function _dismiss() {
    if (!_container) return;
    if (_keyHandler) { document.removeEventListener('keydown', _keyHandler); _keyHandler = null; }
    if (_onMouseMove && _container) _container.removeEventListener('mousemove', _onMouseMove);
    if (_onMouseLeave && _container) _container.removeEventListener('mouseleave', _onMouseLeave);
    _onMouseMove = null;
    _onMouseLeave = null;
    _container.classList.remove('active');
    _container.classList.add('fade-out');
    setTimeout(function () {
      if (_container && _container.parentNode) _container.remove();
      _container = null;
      _ballEl = null;
      _windowEl = null;
      _numberEl = null;
      _cubeContainer = null;
      _floatWrapper = null;
      _cubeEl = null;
      _cubeFaceTexts = null;
      _closeBtn = null;
      _shaking = false;
      _revealed = false;
    }, 300);
  }

  function _revealAnswer() {
    if (!_windowEl || !_numberEl) return;
    _revealed = true;
    _windowEl.classList.add('expanded');
    _numberEl.classList.add('fade');
    _showAnswer(_pickAnswer());
  }

  function _doShake() {
    if (_shaking || !_ballEl) return;
    _shaking = true;
    if (_revealed) {
      _cubeEl.classList.remove('visible');
    }
    _ballEl.classList.add('shaking');
    setTimeout(function () {
      _ballEl.classList.remove('shaking');
      if (!_revealed) {
        _revealAnswer();
      } else {
        _showAnswer(_pickAnswer());
      }
      _shaking = false;
    }, SHAKE_DURATION);
  }

  function _showBall() {
    if (document.getElementById('eightball-container')) return;

    _addStyles();

    _closeBtn = document.createElement('button');
    _closeBtn.id = 'eightball-close';
    _closeBtn.innerHTML = '&times;';
    _closeBtn.setAttribute('aria-label', 'Close');
    _closeBtn.addEventListener('click', function (e) { e.stopPropagation(); _dismiss(); });

    _container = document.createElement('div');
    _container.id = 'eightball-container';
    _container.setAttribute('role', 'dialog');

    _ballEl = document.createElement('div');
    _ballEl.id = 'eightball-ball';
    _ballEl.setAttribute('role', 'button');
    _ballEl.setAttribute('aria-label', I18n.t('8ball.title'));

    _windowEl = document.createElement('div');
    _windowEl.className = 'eightball-window';

    _numberEl = document.createElement('div');
    _numberEl.className = 'eightball-number';
    _numberEl.textContent = '8';

    _cubeEl = document.createElement('div');
    _cubeEl.className = 'eightball-cube';

    _cubeFaceTexts = [];

    function _makeFace(cls) {
      var face = document.createElement('div');
      face.className = 'eightball-cube-face ' + cls;
      var textEl = document.createElement('div');
      textEl.className = 'eightball-cube-text';
      face.appendChild(textEl);
      _cubeFaceTexts.push(textEl);
      return face;
    }

    var fillEl = document.createElement('div');
    fillEl.className = 'eightball-cube-fill';
    _cubeEl.appendChild(fillEl);

    _cubeEl.appendChild(_makeFace('f0'));
    _cubeEl.appendChild(_makeFace('f1'));
    _cubeEl.appendChild(_makeFace('f2'));
    _cubeEl.appendChild(_makeFace('f3'));
    _cubeEl.appendChild(_makeFace('f4'));
    _cubeEl.appendChild(_makeFace('f5'));

    _floatWrapper = document.createElement('div');
    _floatWrapper.className = 'eightball-float-wrapper';
    _floatWrapper.appendChild(_cubeEl);

    _cubeContainer = document.createElement('div');
    _cubeContainer.className = 'eightball-cube-container';
    _cubeContainer.appendChild(_floatWrapper);

    _windowEl.appendChild(_numberEl);
    _windowEl.appendChild(_cubeContainer);
    _ballEl.appendChild(_windowEl);
    _ballEl.appendChild(_closeBtn);
    _container.appendChild(_ballEl);
    document.body.appendChild(_container);

    requestAnimationFrame(function () {
      requestAnimationFrame(function () { _container.classList.add('active'); });
    });

    _ballEl.addEventListener('click', _doShake);

    _container.addEventListener('mousedown', function (e) {
      if (e.target === _container) _dismiss();
    });

    _keyHandler = function (e) { if (e.key === 'Escape') _dismiss(); };
    document.addEventListener('keydown', _keyHandler);

    _onMouseMove = function (e) {
      if (!_ballEl || !_cubeContainer) return;
      var rect = _ballEl.getBoundingClientRect();
      var cx = rect.left + rect.width / 2;
      var cy = rect.top + rect.height / 2;
      var dx = (e.clientX - cx) / (rect.width / 2);
      var dy = (e.clientY - cy) / (rect.height / 2);
      var maxAngle = 14;
      _cubeContainer.style.transform = 'rotateX(' + (-dy * maxAngle) + 'deg) rotateY(' + (dx * maxAngle) + 'deg)';
    };

    _onMouseLeave = function () {
      if (_cubeContainer) _cubeContainer.style.transform = 'rotateX(0deg) rotateY(0deg)';
    };

    _container.addEventListener('mousemove', _onMouseMove);
    _container.addEventListener('mouseleave', _onMouseLeave);
  }

  return {
    init: async function () {
      var settings = await StorageSync.get('settings') || getDefaultSettings();
      if (settings.widgets?.eightball === false) { this.destroy(); return; }
      var wrapper = document.getElementById('mini-widgets-group');
      if (!wrapper) return;
      if (_btn) return;
      _btn = document.createElement('button');
      _btn.className = 'mini-widget-btn';
      _btn.dataset.i18nTitle = '8ball.title';
      _btn.title = I18n.t('8ball.title');
      _btn.textContent = '\uD83D\uDD2E';
      _btn.addEventListener('click', _showBall);
      wrapper.appendChild(_btn);
    },

    destroy: function () {
      _removeStyles();
      if (_btn) { _btn.remove(); _btn = null; }
      if (_keyHandler) { document.removeEventListener('keydown', _keyHandler); _keyHandler = null; }
      if (_onMouseMove && _container) _container.removeEventListener('mousemove', _onMouseMove);
      if (_onMouseLeave && _container) _container.removeEventListener('mouseleave', _onMouseLeave);
      _onMouseMove = null;
      _onMouseLeave = null;
      if (_container) {
        _container.remove();
        _container = null;
        _ballEl = null;
        _windowEl = null;
        _numberEl = null;
        _cubeContainer = null;
        _floatWrapper = null;
        _cubeEl = null;
        _cubeFaceTexts = null;
        _closeBtn = null;
      }
      _shaking = false;
      _revealed = false;
    }
  };
})();

WidgetSystem.register('8ball', EightBallWidget);
