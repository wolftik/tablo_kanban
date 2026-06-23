'use strict';

const PomodoroWidget = (() => {
  const WORK_MS = 25 * 60 * 1000;
  const SHORT_BREAK_MS = 5 * 60 * 1000;
  const LONG_BREAK_MS = 15 * 60 * 1000;
  const LONG_BREAK_AFTER = 4;
  const STORAGE_KEY = 'pomodoro_state';

  const _phaseDurations = {
    work: WORK_MS,
    shortBreak: SHORT_BREAK_MS,
    longBreak: LONG_BREAK_MS
  };

  let _interval = null;
  let _state = null;
  let _btn = null;
  let _pill = null;
  let _overlay = null;
  let _modal = null;
  let _phaseLabel = null;
  let _timerDisplay = null;
  let _countDisplay = null;
  let _progressFill = null;
  let _startBtn = null;
  let _pauseBtn = null;
  let _resetBtn = null;

  function _defaultState() {
    return {
      phase: 'work',
      remaining: WORK_MS,
      pomodoroCount: 0,
      running: false,
      updatedAt: Date.now()
    };
  }

  function _formatTime(ms) {
    const totalSec = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  function _ensureSidebar() {
    let sidebar = document.getElementById('widgets-sidebar');
    if (!sidebar) {
      const zone = document.getElementById('widgets-zone');
      if (!zone) return null;
      sidebar = document.createElement('div');
      sidebar.id = 'widgets-sidebar';
      sidebar.className = 'widgets-sidebar';
      zone.appendChild(sidebar);
    }
    return sidebar;
  }

  function _showPill() {
    if (_pill) return;
    const sidebar = _ensureSidebar();
    if (!sidebar) return;
    _pill = document.createElement('div');
    _pill.id = 'pomodoro-pill';
    _pill.className = 'widget pomodoro-pill';
    _pill.addEventListener('click', () => { _showModal(); });
    sidebar.appendChild(_pill);
    const zone = document.getElementById('widgets-zone');
    if (zone) {
      zone.classList.add('active');
      zone.dataset.enabled = 'true';
    }
  }

  function _hidePill() {
    if (_pill) {
      _pill.remove();
      _pill = null;
    }
  }

  function _renderPill() {
    if (!_pill) return;
    _pill.innerHTML = ''
      + '<div class="pomodoro-pill-top">'
        + '<span class="pomodoro-pill-icon">\uD83C\uDF45</span>'
        + '<span class="pomodoro-pill-phase">' + I18n.t('pomodoro.' + _state.phase) + '</span>'
      + '</div>'
      + '<div class="pomodoro-pill-bottom">'
        + '<span class="pomodoro-pill-timer">' + _formatTime(_state.remaining) + '</span>'
        + '<span class="pomodoro-pill-count">×' + _state.pomodoroCount + '</span>'
      + '</div>';
  }

  async function _saveState() {
    _state.updatedAt = Date.now();
    await StorageLocal.set(STORAGE_KEY, _state);
  }

  async function _loadState() {
    const saved = await StorageLocal.get(STORAGE_KEY);
    if (saved) {
      _state = saved;
      if (_state.running) {
        const elapsed = Date.now() - _state.updatedAt;
        _state.remaining = Math.max(0, _state.remaining - elapsed);
        _state.remaining = Math.floor(_state.remaining / 1000) * 1000;
        _state.updatedAt = Date.now();
        if (_state.remaining <= 0) {
          _advancePhase();
          _state.running = false;
          _state.updatedAt = Date.now();
          _saveState();
        } else {
          _startInterval();
        }
      }
    } else {
      _state = _defaultState();
    }
  }

  function _getPhaseDuration() {
    return _phaseDurations[_state.phase] || WORK_MS;
  }

  function _updateDisplay() {
    if (_modal) {
      const duration = _getPhaseDuration();
      const pct = duration > 0 ? ((duration - _state.remaining) / duration) * 100 : 0;

      _phaseLabel.textContent = I18n.t('pomodoro.' + _state.phase);
      _timerDisplay.textContent = _formatTime(_state.remaining);
      _countDisplay.textContent = '\uD83C\uDF45\u00D7' + _state.pomodoroCount;
      _progressFill.style.width = Math.min(100, Math.max(0, pct)) + '%';
      _startBtn.disabled = _state.running;
      _pauseBtn.disabled = !_state.running;
    }
    _renderPill();
  }

  function _startInterval() {
    if (_interval) clearInterval(_interval);
    _state.running = true;
    _saveState();
    _showPill();
    _updateDisplay();
    _interval = setInterval(() => {
      _state.remaining -= 1000;
      if (_state.remaining <= 0) {
        _state.remaining = 0;
        _updateDisplay();
        _onComplete();
      } else {
        _updateDisplay();
      }
    }, 1000);
  }

  function _pauseTimer() {
    if (_interval) {
      clearInterval(_interval);
      _interval = null;
    }
    _state.running = false;
    _hidePill();
    _saveState();
    _updateDisplay();
  }

  function _resetTimer() {
    if (_interval) {
      clearInterval(_interval);
      _interval = null;
    }
    _state.remaining = _getPhaseDuration();
    _state.running = false;
    _hidePill();
    _saveState();
    _updateDisplay();
  }

  function _advancePhase() {
    const { phase, pomodoroCount } = _state;
    if (phase === 'work') {
      if ((pomodoroCount + 1) % LONG_BREAK_AFTER === 0) {
        _state.phase = 'longBreak';
      } else {
        _state.phase = 'shortBreak';
      }
      _state.remaining = _phaseDurations[_state.phase];
    } else {
      _state.phase = 'work';
      _state.remaining = WORK_MS;
      _state.pomodoroCount++;
    }
  }

  function _onComplete() {
    if (_interval) {
      clearInterval(_interval);
      _interval = null;
    }
    _beep();
    _flashModal();
    _hidePill();
    _advancePhase();
    _state.running = false;
    _state.updatedAt = Date.now();
    _saveState();
    _updateDisplay();
  }

  let _audioCtx = null;

  function _beep() {
    try {
      if (!_audioCtx) {
        _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      const beepTimings = [
        { start: 0, stop: 0.2 },
        { start: 0.3, stop: 0.5 },
        { start: 0.6, stop: 0.8 }
      ];
      for (const t of beepTimings) {
        const osc = _audioCtx.createOscillator();
        const gain = _audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 440;
        gain.gain.value = 0.3;
        osc.connect(gain);
        gain.connect(_audioCtx.destination);
        osc.start(_audioCtx.currentTime + t.start);
        osc.stop(_audioCtx.currentTime + t.stop);
      }
    } catch (e) {
      // Audio unavailable
    }
  }

  function _flashModal() {
    if (!_modal) return;
    _modal.style.transition = 'background 0.3s';
    _modal.style.background = 'rgba(255, 200, 50, 0.25)';
    setTimeout(() => {
      if (_modal) _modal.style.background = '';
    }, 500);
  }

  function _showModal() {
    if (_overlay) _overlay.classList.add('active');
  }

  function _hideModal() {
    if (_overlay) _overlay.classList.remove('active');
  }

  function _onOverlayClick(e) {
    if (e.target === _overlay) _hideModal();
  }

  function _onKeyDown(e) {
    if (e.key === 'Escape') _hideModal();
  }

  async function init() {
    const settings = await StorageSync.get('settings') || getDefaultSettings();
    const enabled = settings.widgets?.pomodoro !== false;
    if (!enabled) {
      destroy();
      _state = _defaultState();
      StorageLocal.remove(STORAGE_KEY);
      return;
    }

    const wrapper = document.getElementById('mini-widgets-group');
    if (!wrapper) return;

    _btn = document.createElement('button');
    _btn.className = 'mini-widget-btn';
    _btn.dataset.i18nTitle = 'pomodoro.title';
    _btn.title = I18n.t('pomodoro.title');
    _btn.textContent = '\uD83C\uDF45';
    wrapper.appendChild(_btn);

    _overlay = document.createElement('div');
    _overlay.className = 'widget-modal-overlay';
    _overlay.addEventListener('click', _onOverlayClick);

    _modal = document.createElement('div');
    _modal.className = 'widget-modal';
    _modal.style.position = 'relative';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'widget-modal-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', _hideModal);
    _modal.appendChild(closeBtn);

    const title = document.createElement('h3');
    title.textContent = I18n.t('pomodoro.title');
    _modal.appendChild(title);

    _phaseLabel = document.createElement('div');
    _phaseLabel.style.cssText = 'font-size:14px;color:var(--bookmark-text);opacity:0.7;text-transform:uppercase;letter-spacing:0.5px;';
    _modal.appendChild(_phaseLabel);

    _timerDisplay = document.createElement('div');
    _timerDisplay.style.cssText = 'font-size:64px;font-weight:700;font-variant-numeric:tabular-nums;line-height:1.1;color:var(--bookmark-text);';
    _modal.appendChild(_timerDisplay);

    _countDisplay = document.createElement('div');
    _countDisplay.style.cssText = 'font-size:14px;color:var(--bookmark-text);opacity:0.6;';
    _modal.appendChild(_countDisplay);

    const progressBar = document.createElement('div');
    progressBar.style.cssText = 'width:100%;height:6px;background:color-mix(in srgb,var(--bookmark-text) 12%,transparent);border-radius:3px;overflow:hidden;';
    _progressFill = document.createElement('div');
    _progressFill.style.cssText = 'height:100%;width:0%;background:var(--accent-color,#4f46e5);border-radius:3px;transition:width 0.3s ease;';
    progressBar.appendChild(_progressFill);
    _modal.appendChild(progressBar);

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:8px;width:100%;';

    const btnBase = 'flex:1;padding:8px 16px;border:1px solid color-mix(in srgb,var(--bookmark-text) 20%,transparent);border-radius:8px;background:var(--card-bg,#fff);color:var(--bookmark-text);cursor:pointer;font-size:14px;font-family:inherit;transition:background 0.15s;';
    const btnHover = 'background:color-mix(in srgb,var(--bookmark-text) 8%,transparent);';

    _startBtn = document.createElement('button');
    _startBtn.textContent = I18n.t('pomodoro.start');
    _startBtn.style.cssText = btnBase;
    _startBtn.addEventListener('mouseenter', () => { _startBtn.style.cssText = btnBase + btnHover; });
    _startBtn.addEventListener('mouseleave', () => { _startBtn.style.cssText = btnBase; });
    _startBtn.addEventListener('click', _startInterval);
    btnRow.appendChild(_startBtn);

    _pauseBtn = document.createElement('button');
    _pauseBtn.textContent = I18n.t('pomodoro.pause');
    _pauseBtn.style.cssText = btnBase;
    _pauseBtn.addEventListener('mouseenter', () => { _pauseBtn.style.cssText = btnBase + btnHover; });
    _pauseBtn.addEventListener('mouseleave', () => { _pauseBtn.style.cssText = btnBase; });
    _pauseBtn.addEventListener('click', _pauseTimer);
    btnRow.appendChild(_pauseBtn);

    _resetBtn = document.createElement('button');
    _resetBtn.textContent = I18n.t('pomodoro.reset');
    _resetBtn.style.cssText = btnBase;
    _resetBtn.addEventListener('mouseenter', () => { _resetBtn.style.cssText = btnBase + btnHover; });
    _resetBtn.addEventListener('mouseleave', () => { _resetBtn.style.cssText = btnBase; });
    _resetBtn.addEventListener('click', _resetTimer);
    btnRow.appendChild(_resetBtn);

    _modal.appendChild(btnRow);
    _overlay.appendChild(_modal);
    document.body.appendChild(_overlay);

    _btn.addEventListener('click', () => {
      _showModal();
    });

    document.addEventListener('keydown', _onKeyDown);

    await _loadState();
    _updateDisplay();
  }

  function destroy() {
    if (_interval) {
      clearInterval(_interval);
      _interval = null;
    }
    if (_state) {
      _state.running = false;
      _saveState();
    }
    document.removeEventListener('keydown', _onKeyDown);
    if (_audioCtx) {
      _audioCtx.close();
      _audioCtx = null;
    }
    if (_btn) {
      _btn.remove();
      _btn = null;
    }
    if (_pill) {
      _pill.remove();
      _pill = null;
    }
    if (_overlay) {
      _overlay.remove();
      _overlay = null;
      _modal = null;
    }
  }

  return { init, destroy };
})();

WidgetSystem.register('pomodoro', PomodoroWidget);
