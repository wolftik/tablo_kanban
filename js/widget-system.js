'use strict';

const WidgetSystem = (() => {
  moduleGuard('StorageSync');
  const _widgets = new Map();
  let _initialized = false;

  function register(name, widget) {
    if (_widgets.has(name)) {
      console.warn(`Widget "${name}" already registered`);
      return;
    }
    _widgets.set(name, widget);
  }

  async function initAll() {
    if (_initialized) return;
    _initialized = true;

    for (const [name, widget] of _widgets) {
      try {
        if (widget.init) await widget.init();
      } catch (e) {
        console.error(`Widget "${name}" init error:`, e);
      }
    }
  }

  return { register, initAll };
})();
