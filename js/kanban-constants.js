'use strict';

moduleGuard('I18n');

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
  ]
};
