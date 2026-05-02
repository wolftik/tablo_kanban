'use strict';

const BookmarksContextMenu = (() => {
  moduleGuard('BookmarksManager');
  let _currentBookmark = null;
  let _currentContainer = null;
  let _closeHandler = null;

  function show(x, y, bookmark, container, callbacks) {
    _currentBookmark = bookmark;
    _currentContainer = container;

    let menu = document.getElementById('bookmark-context-menu');
    if (!menu) {
      menu = document.createElement('div');
      menu.id = 'bookmark-context-menu';
      menu.className = 'bookmark-context-menu';
      menu.innerHTML = `
        <button class="bookmark-context-menu-item edit">
          <span>&#9998;</span>
          <span>Редактировать</span>
        </button>
        <button class="bookmark-context-menu-item delete">
          <span>&#128465;</span>
          <span>Удалить</span>
        </button>
      `;
      document.body.appendChild(menu);
    }

    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.classList.add('show');

    const editBtn = menu.querySelector('.edit');
    const deleteBtn = menu.querySelector('.delete');

    editBtn.onclick = (e) => {
      e.stopPropagation();
      hide();
      if (callbacks.onEdit) callbacks.onEdit(bookmark);
    };

    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      hide();
      if (callbacks.onDelete) callbacks.onDelete(bookmark, container);
    };

    _closeHandler = (e) => {
      if (!menu.contains(e.target)) {
        hide();
      }
    };

    setTimeout(() => {
      document.addEventListener('click', _closeHandler);
      window.addEventListener('resize', _closeHandler);
      window.addEventListener('scroll', _closeHandler, { passive: true });
    }, 0);
  }

  function hide() {
    const menu = document.getElementById('bookmark-context-menu');
    if (menu) menu.classList.remove('show');
    if (_closeHandler) {
      document.removeEventListener('click', _closeHandler);
      window.removeEventListener('resize', _closeHandler);
      window.removeEventListener('scroll', _closeHandler);
      _closeHandler = null;
    }
    _currentBookmark = null;
    _currentContainer = null;
  }

  function getCurrentBookmark() {
    return _currentBookmark;
  }

  function getCurrentContainer() {
    return _currentContainer;
  }

  return { show, hide, getCurrentBookmark, getCurrentContainer };
})();
