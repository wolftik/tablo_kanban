'use strict';

const ArchiveManager = (() => {
  const ARCHIVE_KEY = 'kanban_archive';
  const ARCHIVE_DAYS = 90;
  const ARCHIVE_MS = ARCHIVE_DAYS * 24 * 60 * 60 * 1000;

  async function getArchive() {
    try {
      const val = localStorage.getItem(ARCHIVE_KEY);
      return val ? JSON.parse(val) : { cards: [], _modified: 0 };
    } catch {
      return { cards: [], _modified: 0 };
    }
  }

  async function saveArchive(archive) {
    try {
      localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archive));
      return true;
    } catch (e) {
      console.error('ArchiveManager.saveArchive failed:', e);
      return false;
    }
  }

  async function archiveOldCards(columns) {
    const now = Date.now();
    const cutoffTime = now - ARCHIVE_MS;
    const archive = await getArchive();
    let archivedCount = 0;

    columns.forEach(column => {
      const oldCards = column.cards.filter(card =>
        card.createdAt && card.createdAt < cutoffTime
      );
      if (oldCards.length > 0) {
        oldCards.forEach(card => {
          archive.cards.push({
            ...card,
            _archivedAt: now,
            _originalColumnId: column.id,
            _originalColumnTitle: column.title
          });
        });
        column.cards = column.cards.filter(card =>
          !(card.createdAt && card.createdAt < cutoffTime)
        );
        archivedCount += oldCards.length;
      }
    });

    if (archivedCount > 0) {
      archive._modified = now;
      await saveArchive(archive);
    }
    return { columns, archivedCount };
  }

  async function restoreCard(cardId) {
    const archive = await getArchive();
    const idx = archive.cards.findIndex(c => c.id === cardId);
    if (idx === -1) return null;

    const card = archive.cards.splice(idx, 1)[0];
    delete card._archivedAt;
    delete card._originalColumnId;
    delete card._originalColumnTitle;

    archive._modified = Date.now();
    await saveArchive(archive);
    return card;
  }

  async function restoreAll() {
    const archive = await getArchive();
    const cards = [...archive.cards];
    archive.cards = [];
    archive._modified = Date.now();
    await saveArchive(archive);
    return cards;
  }

  async function clearArchive() {
    try {
      localStorage.removeItem(ARCHIVE_KEY);
      return true;
    } catch { return false; }
  }

  async function getArchiveInfo() {
    const archive = await getArchive();
    const size = JSON.stringify(archive).length;
    return { count: archive.cards.length, size, sizeMB: (size / 1024 / 1024).toFixed(2) };
  }

  return { getArchive, saveArchive, archiveOldCards, restoreCard, restoreAll, clearArchive, getArchiveInfo };
})();
