'use strict';

/**
 * Central constants and configuration defaults for the kanban board.
 * @namespace KanbanConstants
 */
const KanbanConstants = {
  /**
   * Get localized label for a priority key.
   * @param {string} key - Priority key ('low', 'medium', 'high', 'urgent')
   * @returns {string} Localized priority label
   */
  getPriorityLabel(key) {
    return I18n.t('priority.' + key);
  },

  /** @type {ReadonlyArray<string>} */
  PRIORITIES: Object.freeze(['low', 'medium', 'high', 'urgent']),

  /** Storage key used in chrome.storage.local */
  STORAGE_KEY: 'kanban_data',

  /** @type {number} Aging threshold in ms: card becomes "snail" after 7 days */
  AGING_SNAIL_MS: 7 * 24 * 60 * 60 * 1000,
  /** @type {number} Aging threshold in ms: card becomes "fire" after 22 days */
  AGING_FIRE_MS: 22 * 24 * 60 * 60 * 1000,

  /** @type {Array<{title:string, color:string}>} */
  DEFAULT_COLUMNS: [
    { title: 'Backlog', color: '#94a3b8' },
    { title: 'To Do', color: '#6366f1' },
    { title: 'In Progress', color: '#f59e0b' },
    { title: 'Review', color: '#8b5cf6' },
    { title: 'Done', color: '#22c55e' }
  ],

  /** @type {Array<{name:string, color:string}>} */
  DEFAULT_TAGS: [
    { name: 'Bug', color: '#ef4444' },
    { name: 'Feature', color: '#3b82f6' },
    { name: 'Enhancement', color: '#8b5cf6' }
  ],

  /** @type {Array<{name:string, color:string}>} */
  DEFAULT_PERFORMERS: [
    { name: 'Akiko I.N.', color: '#6366f1' },
  ]
};
