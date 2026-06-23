'use strict';

const AlarmTimerWidget = (() => {
  const STORAGE_KEY = 'alarmtimer_state';
  const BEEP_MS = 8000;

  let _interval = null;
  let _state = null;
  let _audioCtx = null;
  let _btn = null;
  let _dot = null;
  let _overlay = null;
  let _modal = null;

  let _tabAlarm = null;
  let _tabTimer = null;
  let _alarmSection = null;
  let _timerSection = null;
  let _alarmH = null;
  let _alarmM = null;
  let _alarmToggle = null;
  let _alarmStatus = null;
  let _alarmSetBtn = null;
  let _timerH = null;
  let _timerM = null;
  let _timerS = null;
  let _timerDisplay = null;
  let _timerStartBtn = null;
  let _timerPauseBtn = null;
  let _timerResetBtn = null;

  function _defaultState() {
    return {
      alarm: { time: '', active: false },
      timer: { duration: 0, remaining: 0, running: false, updatedAt: 0 }
    };
  }

  function _formatTwo(n) { return String(Math.max(0, Math.floor(n))).padStart(2, '0'); }
  function _formatHMS(ms) {
    const sec = Math.max(0, Math.floor(ms / 1000));
    return _formatTwo(sec / 3600) + ':' + _formatTwo((sec % 3600) / 60) + ':' + _formatTwo(sec % 60);
  }

  function _getNowHMS() {
    const d = new Date();
    return _formatTwo(d.getHours()) + ':' + _formatTwo(d.getMinutes()) + ':' + _formatTwo(d.getSeconds());
  }

  async function _saveState() {
    _state.timer.updatedAt = Date.now();
    await StorageLocal.set(STORAGE_KEY, _state);
  }

  async function _loadState() {
    const saved = await StorageLocal.get(STORAGE_KEY);
    if (saved) {
      _state = saved;
      if (_state.timer.running) {
        const elapsed = Date.now() - (_state.timer.updatedAt || Date.now());
        _state.timer.remaining = Math.max(0, _state.timer.remaining - elapsed);
        _state.timer.remaining = Math.floor(_state.timer.remaining / 1000) * 1000;
        if (_state.timer.remaining <= 0) {
          _state.timer.remaining = 0;
          _state.timer.running = false;
          _saveState();
          _onTimerEnd();
        } else {
          _startPoll();
        }
      }
    } else {
      _state = _defaultState();
    }
  }

  function _startPoll() {
    if (_interval) clearInterval(_interval);
    _interval = setInterval(_tick, 1000);
  }

  function _stopPoll() {
    if (_interval) { clearInterval(_interval); _interval = null; }
  }

  function _tick() {
    const nowHMS = _getNowHMS();

    if (_state.alarm.active && _state.alarm.time) {
      const alarmHMS = _state.alarm.time + ':00';
      if (nowHMS === alarmHMS) {
        _state.alarm.active = false;
        _saveState();
        _beep();
        _flashTab();
        _updateDot();
        if (_modal) _renderAlarmSection();
      }
    }

    if (_state.timer.running) {
      _state.timer.remaining -= 1000;
      if (_state.timer.remaining <= 0) {
        _state.timer.remaining = 0;
        _state.timer.running = false;
        _stopPoll();
        _saveState();
        _onTimerEnd();
      }
    }

    _updateDot();
    if (_modal) _renderModalContent();
  }

  function _onTimerEnd() {
    _beep();
    _flashTab();
    _updateDot();
    if (_modal) _renderModalContent();
  }

  function _beep() {
    try {
      if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const beeps = [
        { s: 0, e: 0.2 }, { s: 0.3, e: 0.5 }, { s: 0.6, e: 0.8 },
        { s: 1.5, e: 1.7 }, { s: 1.8, e: 2.0 }, { s: 2.1, e: 2.3 }
      ];
      for (const b of beeps) {
        const osc = _audioCtx.createOscillator();
        const gain = _audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 440;
        gain.gain.value = 0.3;
        osc.connect(gain);
        gain.connect(_audioCtx.destination);
        osc.start(_audioCtx.currentTime + b.s);
        osc.stop(_audioCtx.currentTime + b.e);
      }
    } catch (e) { /* audio unavailable */ }
  }

  let _flashInterval = null;

  function _flashTab() {
    if (_flashInterval) return;
    const origTitle = document.title;
    let ticks = 0;
    _flashInterval = setInterval(() => {
      if (ticks >= 10) { clearInterval(_flashInterval); _flashInterval = null; document.title = origTitle; return; }
      document.title = (ticks % 2 === 0) ? '\uD83D\uDD14 ' + origTitle : origTitle;
      ticks++;
    }, 600);
  }

  function _updateDot() {
    const active = _state.alarm.active || _state.timer.running;
    const timeEl = document.querySelector('#clock-widget .clock-time');
    if (!timeEl) return;

    if (!active) {
      if (_dot) { _dot.remove(); _dot = null; }
      return;
    }

    if (!_dot) {
      _dot = document.createTextNode('.');
      timeEl.appendChild(_dot);
    }
  }

  function _switchTab(tab) {
    if (tab === 'alarm') {
      _tabAlarm.classList.add('active');
      _tabTimer.classList.remove('active');
      _alarmSection.style.display = '';
      _timerSection.style.display = 'none';
    } else {
      _tabTimer.classList.add('active');
      _tabAlarm.classList.remove('active');
      _alarmSection.style.display = 'none';
      _timerSection.style.display = '';
    }
  }

  function _renderAlarmSection() {
    const active = _state.alarm.active;
    _alarmH.value = _state.alarm.time ? _state.alarm.time.split(':')[0] : '';
    _alarmM.value = _state.alarm.time ? _state.alarm.time.split(':')[1] : '';
    _alarmStatus.textContent = active
      ? I18n.t('alarmtimer.alarmSet') + ' ' + _state.alarm.time
      : '';
    _alarmToggle.textContent = active ? I18n.t('alarmtimer.off') : I18n.t('alarmtimer.on');
  }

  function _renderTimerSection() {
    if (_state.timer.running) {
      _timerDisplay.textContent = _formatHMS(_state.timer.remaining);
      _timerStartBtn.disabled = true;
      _timerPauseBtn.disabled = false;
    } else {
      _timerDisplay.textContent = _state.timer.remaining > 0
        ? _formatHMS(_state.timer.remaining)
        : '00:00:00';
      _timerStartBtn.disabled = _state.timer.remaining <= 0;
      _timerPauseBtn.disabled = true;
    }
  }

  function _renderModalContent() {
    if (_modal) {
      _renderAlarmSection();
      _renderTimerSection();
    }
  }

  function _showModal() {
    if (!_modal) return;
    _overlay.classList.add('active');
    _renderModalContent();
  }

  function _hideModal() {
    if (_overlay) _overlay.classList.remove('active');
  }

  async function init() {
    const settings = await StorageSync.get('settings') || getDefaultSettings();
    const enabled = settings.widgets?.alarmtimer !== false;
    if (!enabled) return;

    await _loadState();

    const wrapper = document.getElementById('mini-widgets-group');
    if (!wrapper) return;

    _btn = document.createElement('button');
    _btn.className = 'mini-widget-btn';
    _btn.title = I18n.t('alarmtimer.title');
    _btn.textContent = '\u23F0';
    wrapper.appendChild(_btn);

    _buildModal();
    _btn.addEventListener('click', _showModal);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') _hideModal();
    });

    if (_state.alarm.active || _state.timer.running) {
      _startPoll();
    }
    _updateDot();
  }

  function _buildModal() {
    _overlay = document.createElement('div');
    _overlay.className = 'widget-modal-overlay';
    _overlay.addEventListener('click', (e) => { if (e.target === _overlay) _hideModal(); });

    _modal = document.createElement('div');
    _modal.className = 'widget-modal';
    _modal.style.cssText = 'position:relative;gap:14px;min-width:320px;';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'widget-modal-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', _hideModal);
    _modal.appendChild(closeBtn);

    const title = document.createElement('h3');
    title.textContent = I18n.t('alarmtimer.title');
    _modal.appendChild(title);

    const tabRow = document.createElement('div');
    tabRow.className = 'alarm-timer-tabs';
    _tabAlarm = document.createElement('button');
    _tabAlarm.className = 'alarm-timer-tab';
    _tabAlarm.textContent = I18n.t('alarmtimer.alarm');
    _tabAlarm.addEventListener('click', () => _switchTab('alarm'));
    _tabTimer = document.createElement('button');
    _tabTimer.className = 'alarm-timer-tab';
    _tabTimer.textContent = I18n.t('alarmtimer.timer');
    _tabTimer.addEventListener('click', () => _switchTab('timer'));
    tabRow.appendChild(_tabAlarm);
    tabRow.appendChild(_tabTimer);
    _modal.appendChild(tabRow);

    _alarmSection = document.createElement('div');
    _alarmSection.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:12px;width:100%;';

    const alarmInputRow = document.createElement('div');
    alarmInputRow.className = 'alarm-timer-input-row';
    alarmInputRow.style.cssText = 'gap:6px;';
    _alarmH = document.createElement('input');
    _alarmH.type = 'number'; _alarmH.min = '0'; _alarmH.max = '23';
    _alarmH.placeholder = I18n.t('alarmtimer.hours');
    _alarmH.className = 'alarm-timer-time-input';
    alarmInputRow.appendChild(_alarmH);
    const colon1 = document.createElement('span');
    colon1.className = 'alarm-timer-colon';
    colon1.textContent = ':';
    alarmInputRow.appendChild(colon1);
    _alarmM = document.createElement('input');
    _alarmM.type = 'number'; _alarmM.min = '0'; _alarmM.max = '59';
    _alarmM.placeholder = I18n.t('alarmtimer.minutes');
    _alarmM.className = 'alarm-timer-time-input';
    alarmInputRow.appendChild(_alarmM);
    _alarmSection.appendChild(alarmInputRow);

    _alarmSetBtn = document.createElement('button');
    _alarmSetBtn.textContent = I18n.t('alarmtimer.set');
    _alarmSetBtn.className = 'alarm-timer-btn primary';
    _alarmSetBtn.style.cssText = 'flex:none;padding:8px 32px;';
    _alarmSetBtn.addEventListener('click', () => {
      const h = parseInt(_alarmH.value) || 0;
      const m = parseInt(_alarmM.value) || 0;
      if (h < 0 || h > 23 || m < 0 || m > 59) return;
      _state.alarm.time = _formatTwo(h) + ':' + _formatTwo(m);
      _state.alarm.active = true;
      _startPoll();
      _updateDot();
      _saveState();
      _renderAlarmSection();
    });
    _alarmSection.appendChild(_alarmSetBtn);

    _alarmToggle = document.createElement('button');
    _alarmToggle.className = 'alarm-timer-btn danger';
    _alarmToggle.style.cssText = 'flex:none;padding:8px 24px;';
    _alarmToggle.addEventListener('click', () => {
      _state.alarm.active = !_state.alarm.active;
      if (_state.alarm.active) _startPoll(); else _stopPoll();
      _updateDot();
      _saveState();
      _renderAlarmSection();
      if (!_state.alarm.active && !_state.timer.running) _stopPoll();
    });
    _alarmSection.appendChild(_alarmToggle);

    _alarmStatus = document.createElement('div');
    _alarmStatus.className = 'alarm-timer-status';
    _alarmSection.appendChild(_alarmStatus);
    _modal.appendChild(_alarmSection);

    _timerSection = document.createElement('div');
    _timerSection.style.cssText = 'display:none;flex-direction:column;align-items:center;gap:12px;width:100%;';

    const timerInputRow = document.createElement('div');
    timerInputRow.className = 'alarm-timer-input-row';
    _timerH = document.createElement('input');
    _timerH.type = 'number'; _timerH.min = '0'; _timerH.max = '99';
    _timerH.placeholder = I18n.t('alarmtimer.hours');
    _timerH.className = 'alarm-timer-time-input';
    _timerH.style.cssText = 'width:46px;font-size:13px;padding:6px 4px;';
    timerInputRow.appendChild(_timerH);
    const colon2 = document.createElement('span');
    colon2.className = 'alarm-timer-colon';
    colon2.textContent = ':';
    timerInputRow.appendChild(colon2);
    _timerM = document.createElement('input');
    _timerM.type = 'number'; _timerM.min = '0'; _timerM.max = '59';
    _timerM.placeholder = I18n.t('alarmtimer.minutes');
    _timerM.className = 'alarm-timer-time-input';
    _timerM.style.cssText = 'width:46px;font-size:13px;padding:6px 4px;';
    timerInputRow.appendChild(_timerM);
    const colon3 = document.createElement('span');
    colon3.className = 'alarm-timer-colon';
    colon3.textContent = ':';
    timerInputRow.appendChild(colon3);
    _timerS = document.createElement('input');
    _timerS.type = 'number'; _timerS.min = '0'; _timerS.max = '59';
    _timerS.placeholder = I18n.t('alarmtimer.seconds');
    _timerS.className = 'alarm-timer-time-input';
    _timerS.style.cssText = 'width:46px;font-size:13px;padding:6px 4px;';
    timerInputRow.appendChild(_timerS);
    _timerSection.appendChild(timerInputRow);

    _timerDisplay = document.createElement('div');
    _timerDisplay.className = 'alarm-timer-display';
    _timerDisplay.textContent = '00:00:00';
    _timerSection.appendChild(_timerDisplay);

    const btnRow = document.createElement('div');
    btnRow.className = 'alarm-timer-btn-row';

    _timerStartBtn = document.createElement('button');
    _timerStartBtn.textContent = I18n.t('alarmtimer.start');
    _timerStartBtn.className = 'alarm-timer-btn primary';
    _timerStartBtn.addEventListener('click', () => {
      const h = parseInt(_timerH.value) || 0;
      const m = parseInt(_timerM.value) || 0;
      const s = parseInt(_timerS.value) || 0;
      const dur = (h * 3600 + m * 60 + s) * 1000;
      if (dur <= 0) return;
      _state.timer.duration = dur;
      _state.timer.remaining = dur;
      _state.timer.running = true;
      _startPoll();
      _updateDot();
      _saveState();
      _renderTimerSection();
    });
    btnRow.appendChild(_timerStartBtn);

    _timerPauseBtn = document.createElement('button');
    _timerPauseBtn.textContent = I18n.t('alarmtimer.pause');
    _timerPauseBtn.className = 'alarm-timer-btn';
    _timerPauseBtn.disabled = true;
    _timerPauseBtn.addEventListener('click', () => {
      _state.timer.running = false;
      _stopPoll();
      _updateDot();
      _saveState();
      _renderTimerSection();
    });
    btnRow.appendChild(_timerPauseBtn);

    _timerResetBtn = document.createElement('button');
    _timerResetBtn.textContent = I18n.t('alarmtimer.reset');
    _timerResetBtn.className = 'alarm-timer-btn';
    _timerResetBtn.addEventListener('click', () => {
      _state.timer.running = false;
      _state.timer.remaining = 0;
      _stopPoll();
      _updateDot();
      _saveState();
      _renderTimerSection();
    });
    btnRow.appendChild(_timerResetBtn);
    _timerSection.appendChild(btnRow);
    _modal.appendChild(_timerSection);

    _overlay.appendChild(_modal);
    document.body.appendChild(_overlay);

    _switchTab('alarm');
  }

  function destroy() {
    _stopPoll();
    if (_state) {
      if (_state.timer.running) {
        _state.timer.running = false;
        _saveState();
      }
    }
    if (_audioCtx) { _audioCtx.close(); _audioCtx = null; }
    if (_btn) { _btn.remove(); _btn = null; }
    if (_dot) { _dot.remove(); _dot = null; }
    if (_overlay) { _overlay.remove(); _overlay = null; _modal = null; }
    if (_flashInterval) { clearInterval(_flashInterval); _flashInterval = null; }
  }

  return { init, destroy };
})();

WidgetSystem.register('alarmtimer', AlarmTimerWidget);
