'use strict';

moduleGuard('I18n');
moduleGuard('generateId');

const KanbanConstants = {
  getPriorityLabel(key) {
    return I18n.t('priority.' + key);
  },

  PRIORITIES: Object.freeze(['low', 'medium', 'high', 'urgent']),

  STORAGE_KEY: 'kanban_data',

  DEFAULT_COLUMNS: [
    { title: 'Backlog', color: '#94a3b8' },
    { title: 'To Do', color: '#6366f1' },
    { title: 'In Progress', color: '#f59e0b' },
    { title: 'Review', color: '#8b5cf6' },
    { title: 'Done', color: '#22c55e' }
  ],

  DEFAULT_TAGS: [
    { id: generateId(), name: 'Bug', color: '#ef4444' },
    { id: generateId(), name: 'Feature', color: '#3b82f6' },
    { id: generateId(), name: 'Enhancement', color: '#8b5cf6' }
  ],

  DEFAULT_PERFORMERS: [
    { id: generateId(), name: 'Akiko I.N.', color: '#6366f1' },
  ]
};
