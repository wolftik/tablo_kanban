'use strict';

const KanbanDnD = (() => {
  let _draggedCard = null;
  let _draggedColumn = null;
  let _rafGetDragAfterElement = createRafDragAfterElement();
  let _onSave = null;

  function init(saveCallback) {
    _onSave = saveCallback;
  }

  function getDraggedCard() {
    return _draggedCard;
  }

  function getDraggedColumn() {
    return _draggedColumn;
  }

  function setDraggedColumn(id) {
    _draggedColumn = id;
  }

  function clearDraggedColumn() {
    _draggedColumn = null;
  }

  function bindCardDrag(cardEl) {
    cardEl.addEventListener('dragstart', (e) => {
      _draggedCard = {
        cardId: cardEl.dataset.cardId,
        fromColumnId: cardEl.dataset.columnId
      };
      cardEl.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', cardEl.dataset.cardId);
      e.dataTransfer.setDragImage(cardEl, e.offsetX, e.offsetY);
    });

    cardEl.addEventListener('dragend', () => {
      cardEl.classList.remove('dragging');
      _draggedCard = null;
      document.querySelectorAll('.drop-placeholder').forEach(p => p.remove());
    });
  }

  function bindColumnDragDrop(colEl, cardsContainer, columnId) {
    cardsContainer.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';

      const afterElement = _rafGetDragAfterElement(cardsContainer, e.clientY, '.kanban-card:not(.dragging)');
      let placeholder = cardsContainer.querySelector('.drop-placeholder');
      if (!placeholder) {
        placeholder = KanbanCard.createPlaceholder();
      }
      if (afterElement == null) {
        cardsContainer.appendChild(placeholder);
      } else {
        cardsContainer.insertBefore(placeholder, afterElement);
      }
    });

    cardsContainer.addEventListener('dragleave', (e) => {
      if (!cardsContainer.contains(e.relatedTarget)) {
        const placeholder = cardsContainer.querySelector('.drop-placeholder');
        if (placeholder) placeholder.remove();
      }
    });

    cardsContainer.addEventListener('drop', (e) => {
      e.preventDefault();
      if (!_draggedCard) return;

      const { cardId, fromColumnId } = _draggedCard;
      if (fromColumnId === columnId) {
        KanbanStore.reorderCardInColumn(columnId, cardId);
      } else {
        KanbanStore.moveCard(fromColumnId, columnId, cardId);
      }

      document.querySelectorAll('.drop-placeholder').forEach(p => p.remove());
      KanbanRenderer.updateColumnCounts();
      if (_onSave) _onSave();
      _draggedCard = null;
    });

    colEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      colEl.classList.add('drag-over-column');
    });

    colEl.addEventListener('dragleave', (e) => {
      if (!colEl.contains(e.relatedTarget)) {
        colEl.classList.remove('drag-over-column');
      }
    });

    colEl.addEventListener('dragenter', () => {
      colEl.classList.add('drag-over-column');
    });

    colEl.addEventListener('drop', (e) => {
      e.preventDefault();
      colEl.classList.remove('drag-over-column');
    });
  }

  function bindColumnReorder(board) {
    let _colRafId = null;
    let _colX = 0;

    board.addEventListener('dragover', (e) => {
      if (!_draggedColumn) return;
      if (KanbanStore.isFirstColumn(_draggedColumn)) return;
      e.preventDefault();

      if (_colRafId) cancelAnimationFrame(_colRafId);
      _colX = e.clientX;
      _colRafId = requestAnimationFrame(() => {
        _colRafId = null;
        const draggingCol = board.querySelector('.kanban-column.dragging');
        if (!draggingCol) return;

        const allColumns = [...board.querySelectorAll('.kanban-column')];
        const firstCol = allColumns.find(el => KanbanStore.isFirstColumn(el.dataset.columnId));
        const columns = allColumns.filter(el => !el.classList.contains('dragging') && el !== firstCol);
        const afterElement = columns.reduce((closest, child) => {
          const box = child.getBoundingClientRect();
          const offset = _colX - box.left - box.width / 2;
          if (offset < 0 && offset > closest.offset) {
            return { offset, element: child };
          }
          return closest;
        }, { offset: Number.NEGATIVE_INFINITY }).element;

        if (afterElement == null) {
          board.appendChild(draggingCol);
        } else {
          board.insertBefore(draggingCol, afterElement);
        }
      });
    });

    board.addEventListener('drop', (e) => {
      if (!_draggedColumn) return;
      if (KanbanStore.isFirstColumn(_draggedColumn)) return;
      e.preventDefault();

      const columnEls = [...board.querySelectorAll('.kanban-column')];
      const columnIds = columnEls.map(el => el.dataset.columnId);
      KanbanStore.reorderColumns(columnIds);
      if (_onSave) _onSave();
      _draggedColumn = null;
    });
  }

  function bindColumnHeaderDrag(board) {
    if (!board) return;
    board.addEventListener('dragstart', (e) => {
      const header = e.target.closest('.column-header');
      if (!header) return;
      const colEl = header.closest('.kanban-column');
      if (!colEl) return;
      if (KanbanStore.isFirstColumn(colEl.dataset.columnId)) {
        e.preventDefault();
        return;
      }
      _draggedColumn = colEl.dataset.columnId;
      colEl.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', 'column:' + colEl.dataset.columnId);
    });

    board.addEventListener('dragend', () => {
      _draggedColumn = null;
      board.querySelectorAll('.kanban-column').forEach(c => c.classList.remove('dragging'));
      board.querySelectorAll('.drag-over-column').forEach(c => c.classList.remove('drag-over-column'));
    });
  }

  function setDraggedCard(cardId, fromColumnId) {
    _draggedCard = { cardId, fromColumnId };
  }

  function clearDraggedCard() {
    _draggedCard = null;
  }

  return {
    init, getDraggedCard, getDraggedColumn, setDraggedColumn, clearDraggedColumn,
    setDraggedCard, clearDraggedCard,
    bindCardDrag, bindColumnDragDrop, bindColumnReorder, bindColumnHeaderDrag
  };
})();
