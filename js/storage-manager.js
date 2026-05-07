'use strict';

const StorageManager = (() => {
  let _mode = null;
  let _modePromise = null;

  async function getMode() {
    if (_mode) return _mode;
    if (!_modePromise) {
      _modePromise = (async () => {
        const signedIn = await SyncProvider.isSignedIn();
        _mode = signedIn ? 'cloud' : 'local';
        return _mode;
      })();
    }
    return _modePromise;
  }

  function resetMode() {
    _mode = null;
    _modePromise = null;
  }

  async function getLocalCached(key) {
    return await StorageLocal.get(key);
  }

  async function get(key) {
    const mode = await getMode();
    if (mode === 'cloud') {
      try {
        const data = await SyncProvider.download();
        if (data) {
          safeLocalCache(key, data);
        }
        return data;
      } catch (e) {
        console.warn('[StorageManager] Cloud download failed, using local cache:', e);
        return await StorageLocal.get(key);
      }
    } else {
      return await StorageLocal.get(key);
    }
  }

  async function set(key, value, onError) {
    const mode = await getMode();
    if (mode === 'cloud') {
      try {
        await SyncProvider.upload(value);
        safeLocalCache(key, value);
        return true;
      } catch (e) {
        if (onError) onError(e);
        return false;
      }
    } else {
      return await StorageLocal.set(key, value, onError);
    }
  }

  async function migrateToCloud() {
    const localData = await StorageLocal.get(KanbanConstants.STORAGE_KEY);
    if (!localData || !localData.columns) return;

    const cloudData = await SyncProvider.download();
    if (cloudData && cloudData._modified) {
      const localModified = localData._modified || 0;
      const cloudModified = cloudData._modified;
      if (cloudModified > localModified) return;
    }

    localData._modified = Date.now();
    await SyncProvider.upload(localData);
    StorageLocal.clear();
    _mode = 'cloud';
    _modePromise = null;
  }

  async function migrateToLocal(force) {
    let cloudData;
    try {
      cloudData = await SyncProvider.download();
    } catch (e) {
      console.warn('[StorageManager] Cloud download failed during migration:', e);
      return;
    }
    if (!cloudData || !cloudData.columns) return;

    const allCards = [];
    cloudData.columns.forEach(col => {
      col.cards.forEach(card => {
        allCards.push({ card, columnId: col.id });
      });
    });

    allCards.sort((a, b) => (b.card.createdAt || 0) - (a.card.createdAt || 0));

    const storageInfo = StorageLocal.getStorageInfo();
    const baseColumns = cloudData.columns.map(c => ({ ...c, cards: [] }));
    const baseSize = JSON.stringify({ columns: baseColumns }).length;
    let available = storageInfo.free - baseSize;

    const selectedCards = [];
    const overflowCards = [];

    for (const item of allCards) {
      const cardSize = JSON.stringify(item.card).length;
      if (cardSize <= available) {
        selectedCards.push(item);
        available -= cardSize;
      } else {
        overflowCards.push(item);
      }
    }

    if (overflowCards.length > 0) {
      if (!force) {
        return {
          total: allCards.length,
          saved: selectedCards.length,
          lost: overflowCards.length,
          aborted: true
        };
      }
    }

    cloudData.columns.forEach(col => {
      col.cards = selectedCards
        .filter(item => item.columnId === col.id)
        .map(item => item.card);
    });

    cloudData._modified = Date.now();
    await StorageLocal.set(KanbanConstants.STORAGE_KEY, cloudData);

    _mode = 'local';
    _modePromise = null;

    return {
      total: allCards.length,
      saved: selectedCards.length,
      lost: overflowCards.length,
      aborted: false
    };
  }

  function getStorageInfo() {
    return StorageLocal.getStorageInfo();
  }

  return { getMode, resetMode, get, set, getLocalCached, migrateToCloud, migrateToLocal, getStorageInfo };
})();
