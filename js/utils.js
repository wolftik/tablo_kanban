function getDragAfterElement(container, y) {
  const elements = [...container.querySelectorAll('.column-option-item:not([style*="opacity: 0.5"])')];
  if (elements.length === 0) return null;
  return elements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    }
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY, element: null }).element;
}

function getCardDragAfterElement(container, y) {
  const cards = [...container.querySelectorAll('.kanban-card:not(.dragging)')];
  if (cards.length === 0) return null;
  return cards.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    }
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY, element: null }).element;
}
