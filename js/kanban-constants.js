'use strict';

moduleGuard('I18n');

function _makeId() {
  return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2);
}

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
    { id: _makeId(), name: 'Bug', color: '#ef4444' },
    { id: _makeId(), name: 'Feature', color: '#3b82f6' },
    { id: _makeId(), name: 'Enhancement', color: '#8b5cf6' }
  ],

  DEFAULT_PERFORMERS: [
    { id: _makeId(), name: 'Иванов И.И.', color: '#6366f1' },
    { id: _makeId(), name: 'Петров П.П.', color: '#22c55e' },
    { id: _makeId(), name: 'Сидоров С.С.', color: '#f59e0b' }
  ]
};
