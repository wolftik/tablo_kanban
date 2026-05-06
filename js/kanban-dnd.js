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

  function _getInsertIndex(container, columnId) {
    const placeholder = container.querySelector('.drop-placeholder');
    if (!placeholder) return null;

    const col = KanbanStore.getColumns().find(c => c.id === columnId);
    if (!col) return null;

    const prevSibling = placeholder.previousElementSibling;
    if (prevSibling && prevSibling.classList.contains('kanban-card')) {
      const prevCardId = prevSibling.dataset.cardId;
      const prevIndex = col.cards.findIndex(c => c.id === prevCardId);
      return prevIndex !== -1 ? prevIndex + 1 : col.cards.length;
    }

    const firstVisible = container.querySelector('.kanban-card');
    if (firstVisible) {
      const firstCardId = firstVisible.dataset.cardId;
      const firstIndex = col.cards.findIndex(c => c.id === firstCardId);
      return firstIndex !== -1 ? firstIndex : 0;
    }

    return col.cards.length;
  }

  function bindColumnDragDrop(colEl, cardsContainer, columnId) {
    // Writes to DOM happen ONLY inside this rAF-driven function, never directly
    // on dragover. This guarantees DOM is mutated at most 60x/s and the browser
    // can coalesce all layout invalidations into the next frame.
    function _updatePlaceholder(container, afterElement) {
      let placeholder = container.querySelector('.drop-placeholder');
      if (!placeholder) {
        placeholder = KanbanCard.createPlaceholder();
      }
      if (afterElement == null || !container.contains(afterElement)) {
        container.appendChild(placeholder);
      } else {
        container.insertBefore(placeholder, afterElement);
      }
    }

    cardsContainer.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      // Phase 1 — save cursor, return instantly (no DOM, no layout query)
      _rafGetDragAfterElement(cardsContainer, e.clientY, '.kanban-card:not(.dragging)', _updatePlaceholder);
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
      const insertIndex = _getInsertIndex(cardsContainer, columnId);
      if (fromColumnId === columnId) {
        KanbanStore.reorderCardInColumn(columnId, cardId, insertIndex);
      } else {
        KanbanStore.moveCard(fromColumnId, columnId, cardId, insertIndex);
      }

      document.querySelectorAll('.drop-placeholder').forEach(p => p.remove());
      KanbanRenderer.renderBoard(KanbanStore.getColumns());
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

    const onDragOver = (e) => {
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
    };

    const onDrop = (e) => {
      if (!_draggedColumn) return;
      if (KanbanStore.isFirstColumn(_draggedColumn)) return;
      e.preventDefault();

      const columnEls = [...board.querySelectorAll('.kanban-column')];
      const columnIds = columnEls.map(el => el.dataset.columnId);
      KanbanStore.reorderColumns(columnIds);
      if (_onSave) _onSave();
      _draggedColumn = null;
    };

    board.addEventListener('dragover', onDragOver);
    board.addEventListener('drop', onDrop);

    return () => {
      board.removeEventListener('dragover', onDragOver);
      board.removeEventListener('drop', onDrop);
    };
  }

  function bindColumnHeaderDrag(board) {
    if (!board) return () => {};

    const onDragStart = (e) => {
      const target = e.target?.nodeType === Node.ELEMENT_NODE ? e.target : e.target?.parentElement;
      const header = target?.closest('.column-header');
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
    };

    const onDragEnd = () => {
      _draggedColumn = null;
      board.querySelectorAll('.kanban-column').forEach(c => c.classList.remove('dragging'));
      board.querySelectorAll('.drag-over-column').forEach(c => c.classList.remove('drag-over-column'));
    };

    board.addEventListener('dragstart', onDragStart);
    board.addEventListener('dragend', onDragEnd);

    return () => {
      board.removeEventListener('dragstart', onDragStart);
      board.removeEventListener('dragend', onDragEnd);
    };
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
