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
    let _rafId = null;
    let _cursorX = 0;
    let _targetColumnId = null;
    let _insertAfter = false;

    /**
     * Removes all column drop target highlights from the board.
     */
    function _clearDropTargets() {
      board.querySelectorAll('.column-drop-target-before,.column-drop-target-after')
        .forEach(el => {
          el.classList.remove('column-drop-target-before');
          el.classList.remove('column-drop-target-after');
        });
    }

    /**
     * Computes the target column and insertion side from cursor position.
     * Only adds/removes CSS classes — never touches column DOM ordering.
     */
    function _updateDropTarget(cursorX) {
      const allColumns = [...board.querySelectorAll('.kanban-column')];
      const firstCol = allColumns.find(el => KanbanStore.isFirstColumn(el.dataset.columnId));
      const lastCol = allColumns.find(el => KanbanStore.isLastColumn(el.dataset.columnId));
      const columns = allColumns.filter(
        el => !el.classList.contains('dragging') && el !== firstCol && el !== lastCol
      );

      // Find the element with cursor in its left half
      const refElement = columns.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = cursorX - box.left - box.width / 2;
        if (offset < 0 && offset > closest.offset) {
          return { offset, element: child };
        }
        return closest;
      }, { offset: Number.NEGATIVE_INFINITY }).element;

      let newTarget = null;
      let after = false;

      if (refElement) {
        const draggedCol = board.querySelector('.kanban-column.dragging');
        const draggedRect = draggedCol ? draggedCol.getBoundingClientRect() : null;
        const targetRect = refElement.getBoundingClientRect();
        const cursorInLeftHalf = cursorX < targetRect.left + targetRect.width / 2;

        if (cursorInLeftHalf) {
          if (draggedRect && targetRect.left > draggedRect.left && columns.indexOf(refElement) === 0) {
            // LEFT-to-RIGHT into the FIRST element to the right → insert AFTER it
            newTarget = refElement.dataset.columnId;
            after = true;
          } else {
            // RIGHT-to-LEFT (or non-first element) → insert BEFORE it
            newTarget = refElement.dataset.columnId;
            after = false;
          }
        } else {
          // Cursor in right half → insert AFTER this element
          newTarget = refElement.dataset.columnId;
          after = true;
        }
      } else if (lastCol) {
        // Cursor past all elements → insert before last column
        newTarget = lastCol.dataset.columnId;
        after = false;
      }

      // Only update DOM classes if target changed
      if (newTarget !== _targetColumnId || after !== _insertAfter) {
        _clearDropTargets();
        _targetColumnId = newTarget;
        _insertAfter = after;

        if (newTarget) {
          const targetEl = board.querySelector(`.kanban-column[data-column-id="${newTarget}"]`);
          if (targetEl) {
            targetEl.classList.add(after ? 'column-drop-target-after' : 'column-drop-target-before');
          }
        }
      }
    }

    const onDragOver = (e) => {
      if (!_draggedColumn) return;
      if (KanbanStore.isFirstColumn(_draggedColumn) || KanbanStore.isLastColumn(_draggedColumn)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';

      _cursorX = e.clientX;
      if (_rafId) cancelAnimationFrame(_rafId);
      _rafId = requestAnimationFrame(() => {
        _rafId = null;
        _updateDropTarget(_cursorX);
      });
    };

    const onDrop = (e) => {
      if (!_draggedColumn) return;
      if (KanbanStore.isFirstColumn(_draggedColumn) || KanbanStore.isLastColumn(_draggedColumn)) return;
      e.preventDefault();

      // Always compute target from the actual drop position, not the last dragover
      if (_rafId) {
        cancelAnimationFrame(_rafId);
        _rafId = null;
      }
      _updateDropTarget(e.clientX);

      _clearDropTargets();

      // Compute new column order for the store
      if (_targetColumnId && _targetColumnId !== _draggedColumn) {
        const allCols = KanbanStore.getColumns();
        const targetIdx = allCols.findIndex(c => c.id === _targetColumnId);
        if (targetIdx >= 0) {
          const newOrder = allCols.filter(c => c.id !== _draggedColumn);
          const insertAt = newOrder.findIndex(c => c.id === _targetColumnId);
          const insertPos = _insertAfter ? insertAt + 1 : insertAt;
          const draggedCol = allCols.find(c => c.id === _draggedColumn);
          if (draggedCol) {
            newOrder.splice(insertPos, 0, draggedCol);
          }
          KanbanStore.reorderColumns(newOrder.map(c => c.id));
        }
      }

      // Sync order fields — reorderColumns changes array positions but not col.order,
      // and renderBoard sorts by col.order so we must update them first.
      const cols = KanbanStore.getColumns();
      cols.forEach((col, i) => { col.order = i; });

      // Re-render board and save.
      // Note: renderBoard updates column content but does NOT move existing
      // column elements in the DOM (virtual diffing). We must fix DOM order manually.
      KanbanRenderer.renderBoard(cols);

      const boardEl = document.getElementById('kanban-board');
      const addBtn = boardEl ? boardEl.querySelector(':scope > .add-column-btn') : null;
      if (addBtn) {
        // Forward iteration + insertBefore(addBtn) stacks columns in correct order
        const sorted = [...cols].sort((a, b) => (a.order || 0) - (b.order || 0));
        sorted.forEach(col => {
          const el = boardEl.querySelector(`.kanban-column[data-column-id="${col.id}"]`);
          if (el) {
            boardEl.insertBefore(el, addBtn);
          }
        });
      }

      KanbanRenderer.updateColumnCounts();
      if (_onSave) _onSave();

      _draggedColumn = null;
      _targetColumnId = null;
      _insertAfter = false;
      _rafId = null;
    };

    board.addEventListener('dragover', onDragOver);
    board.addEventListener('drop', onDrop);

    return () => {
      board.removeEventListener('dragover', onDragOver);
      board.removeEventListener('drop', onDrop);
      _clearDropTargets();
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
      if (KanbanStore.isFirstColumn(colEl.dataset.columnId) || KanbanStore.isLastColumn(colEl.dataset.columnId)) {
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
      board.querySelectorAll('.column-drop-target-before,.column-drop-target-after').forEach(c => {
        c.classList.remove('column-drop-target-before');
        c.classList.remove('column-drop-target-after');
      });
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
