# Tablo Kanban — Project Overview

> Chrome Extension (Manifest V3) — заменяет страницу новой вкладки на панель закладок и Kanban-доску.

---

## Структура проекта

```
tablo_kanban/
├── manifest.json              # Манифест Chrome Extension MV3
├── icons/
│   ├── icon16.svg
│   ├── icon48.svg
│   └── icon128.svg
├── css/
│   ├── bookmarks.css           # Стили сетки закладок, модалок, контекстного меню
│   ├── kanban.css              # Основные стили доски (колонки, карточки, фильтры, теги)
│   ├── options.css             # Стили страницы настроек (табы, свитчи, списки, синхронизация)
│   └── widgets.css             # Стили виджетов (часы, погода)
├── js/
│   ├── i18n.js                 # Интернационализация (ru/en/zh) — IIFE модуль
│   ├── utils.js                # Утилиты: escapeHtml, drag helpers, generateId, theme, moduleGuard
│   ├── storage-sync.js         # Обёртка над chrome.storage.sync + localStorage fallback
│   ├── storage-local.js        # Обёртка над chrome.storage.local + localStorage fallback
│   ├── drive-sync.js           # Синхронизация через Google Drive REST API
│   ├── yadisk-sync.js          # Синхронизация через Яндекс.Диск REST API
│   ├── sync-provider.js        # Абстракция над провайдерами синхронизации
│   ├── kanban-constants.js     # Константы: приоритеты, колонки по умолчанию, теги, исполнители
│   ├── kanban-filter.js        # Управление состоянием фильтров (поиск, приоритет, исполнитель, теги)
│   ├── kanban-card.js          # Создание DOM-элементов карточек
│   ├── kanban.js               # Ядро Kanban-доски (IIFE)
│   ├── widget-system.js        # Система регистрации и жизненного цикла виджетов
│   ├── bookmarks-context-menu.js  # Контекстное меню для закладок
│   ├── bookmarks.js            # Менеджер закладок (22 слота, drag-and-drop)
│   ├── newtab.js               # Точка входа для newtab.html
│   └── options.js              # Точка входа для options.html
├── views/
│   ├── newtab.html             # Страница новой вкладки
│   └── options.html            # Страница настроек
└── PROJECT.md                  # Данный файл
```

---

## Архитектура

### Паттерн модулей
Все JS-модули используют IIFE (Immediately Invoked Function Expression) с `'use strict'`, экспортируя единственный глобальный объект (const). Это предотвращает загрязнение глобальной области видимости и совместимо с CSP Chrome Extension.

### Порядок загрузки скриптов (newtab.html)
```
i18n.js → utils.js → storage-sync.js → storage-local.js →
drive-sync.js → yadisk-sync.js → sync-provider.js →
kanban-constants.js → kanban-filter.js → kanban-card.js →
widget-system.js → bookmarks-context-menu.js → bookmarks.js →
kanban.js → newtab.js
```

### Стратегия хранения данных
| Данные | Хранилище | Лимит | Назначение |
|--------|-----------|-------|------------|
| Настройки, закладки | `chrome.storage.sync` (StorageSync) | ~100 KB | Синхронизация между устройствами |
| Kanban-доска (колонки, карточки) | `chrome.storage.local` (StorageLocal) | ~10 MB | Основные данные доски |
| Резервная копия доски | Google Drive / Яндекс.Диск | — | Облачная синхронизация через SyncProvider |

### Система синхронизации
`SyncProvider` — фасад над `DriveSync` и `YadiskSync`. Выбор провайдера хранится в `chrome.storage.sync` по ключу `sync_provider`. При инициализации доска пытается загрузить более свежую версию с облака (сверяя `_modified` timestamp). При сохранении — сохраняет локально и загружает в облако.

### Система виджетов
`WidgetSystem` — реестр виджетов с методами `register()` и `initAll()`. Встроенные виджеты:
- **ClockWidget** — цифровые часы с датой, обновление каждую секунду
- **WeatherWidget** — погода через Open-Meteo API (геокодинг + forecast), обновление каждый час

### Темизация (light/dark/system)
CSS-переменные в `:root` / `[data-theme="dark"]`. Функция `applyTheme()` в `utils.js` применяет тему на `document.documentElement`.

---

## Интернационализация (i18n)

- **Модуль:** `js/i18n.js`, IIFE, экспортирует `I18n`
- **Языки:** Русский (ru) — по умолчанию, Английский (en), Китайский упрощённый (zh)
- **Ключи:** ~65 ключей в объекте `LOCALES`, сгруппированных по доменам (`bookmark.*`, `filter.*`, `priority.*`, `modal.*`, `column.*`, `card.*`, `options.*`, `weather.*`, `widgets.*`)
- **Атрибуты DOM:** `data-i18n` (textContent), `data-i18n-placeholder` (placeholder), `data-i18n-title` (title), `data-i18n-args` (интерполяция)
- **Динамический перевод:** Вызов `I18n.t(key, args)` при создании DOM-элементов через JS
- **Смена языка:** Сохраняется в `settings.language` в `chrome.storage.sync`

---

## Ключевые функции

### Панель закладок
- 22 слота в сетке 11×2
- Drag-and-drop для перестановки
- Контекстное меню (редактировать/удалить)
- Google favicon с fallback
- Отображение закладок из Chrome Bookmarks API (visible bookmarks)
- Адаптивные режимы: normal / compact / minimal (в зависимости от ширины слота)

### Kanban-доска
- Колонки с заголовком, цветовым индикатором, счётчиком карточек
- Карточки с приоритетом (цветная полоса слева + badge), датой, исполнителем (аватар), тегами (цветные badge)
- Drag-and-drop карточек между колонками и внутри колонки
- Drag-and-drop колонок для изменения порядка
- Фильтрация по тексту, приоритету, исполнителю, тегам
- Создание/редактирование/удаление карточек через модальное окно
- Выбор тегов через dropdown с чекбоксами
- Очистка колонки (с подтверждением через prompt)
- Автосохранение с debounce 300ms

### Страница настроек
- Табы: Колонки, Теги, Исполнители, Авторы, Настройки, Синхронизация
- Drag-and-drop переупорядочивание колонок
- CRUD для тегов/исполнителей/авторов с выбором цвета
- Выбор темы (light/dark/system), языка, виджетов
- Настройка погоды (город, единицы измерения)
- Подключение Google Drive или Яндекс.Диск для синхронизации
- Yandex Disk OAuth token management
- Кнопки поддержки проекта (Т-Банк, Юмани, WebMoney)

---

## Результаты ревью кода (2026-05-02)

### Критические баги

| # | Файл | Проблема | Серьёзность |
|---|------|----------|-------------|
| 1 | `kanban-constants.js:24-31` | `generateId()` вызывается на top-level для `DEFAULT_TAGS` и `DEFAULT_PERFORMERS`. При каждом включении модуля генерируются новые ID, что приводит к расхождению ссылок между модулями kanban.js и options.js. ID должны генерироваться только при создании экземпляров. | **Высокая** |
| 2 | `options.js:237` | В `renderColumnsList()` строка `dragId = null;` обращается к несуществующей переменной (фактически создаёт глобальную). В `_bindColumnDragDrop()` `let dragId = null;` объявлена внутри. | **Высокая** |
| 3 | `kanban.js:1044-1063` | `_clearColumnCards()` использует нативный `prompt()`, который блокирует UI и не кастомизируется. | **Средняя** |

### Проблемы i18n

| # | Файл | Проблема |
|---|------|----------|
| 4 | `newtab.html:40-49` | Селект `#filter-priority` не содержит `data-i18n` атрибутов на корневом элементе. Опции имеют `data-i18n`, но селект в целом не участвует в `applyTranslations()`. |
| 5 | `kanban.js` | Динамически создаваемые селекты (assignee/author/priority в модалке) не сохраняют `data-i18n` атрибуты. При смене языка они не переведутся без пересоздания. |
| 6 | `kanban.js:1168` | `filter-tag-chip-remove` title проставляется при создании, но не обновляется через `applyTranslations()`. |

### Проблемы безопасности

| # | Файл | Проблема |
|---|------|----------|
| 7 | `kanban.js:976`, `options.js:209` | `escapeHtml()` используется внутри `confirm()`, который показывает plain text. Экранирование HTML избыточно (но и не вредно). |

### Проблемы производительности

| # | Файл | Проблема |
|---|------|----------|
| 8 | `kanban.js` | `_renderBoard()` полностью перестраивает DOM при любом изменении (фильтр, добавление карточки). Для многих колонок и карточек это может вызывать заметные задержки. Решение: инвалидировать только изменившиеся колонки. |
| 9 | `bookmarks.js:118-120` | Два последовательных `StorageSync.get()` в `render()` — можно объединить в один. |
| 10 | `drive-sync.js`, `yadisk-sync.js` | Каждое сохранение делает запрос на поиск/создание файла перед загрузкой. Стоит кешировать ID файла. |

### Проблемы синхронизации

| # | Файл | Проблема |
|---|------|----------|
| 11 | `kanban.js:66-91` | `_tryLoadFromDrive()` не имеет блокировки. Два concurrent вызова `init()` могут одновременно читать и перезаписывать данные. |
| 12 | `drive-sync.js:81-92` | `signOut()` использует `removeCachedAuthToken` без `clearAllCachedAuthTokens`. При ошибках токена пользователь может застрять в состоянии "подключено". |

### UI/UX

| # | Файл | Проблема |
|---|------|----------|
| 13 | `options.js` | При переключении провайдера или входе/выходе нет индикации загрузки (spinner/disabled). |
| 14 | `options.js` | Настройки погоды (weather-settings) используют `display: block`/`none`, теряя стиль `display: flex` при показе. |
| 15 | `kanban.js` | В модалке редактирования карточки нет кнопки "Закрыть" (крестик), только overlay click и Escape. |

### Структурные замечания

| # | Файл | Проблема |
|---|------|----------|
| 16 | `kanban-card.js:18-22` | Функция `_getTagsForDisplay()` имеет два режима работы (tagById callback vs массив tags), что усложняет чтение. Лучше разделить на две функции или унифицировать интерфейс. |
| 17 | `options.js:123` | `_randomColor()` может генерировать слишком светлые или тёмные цвета — плохая читаемость на badge/avatar. |
| 18 | `sync-provider.js:8-10` | Смесь callback-стиля (`new Promise(resolve => chrome.storage.sync.get(...))`) с async/await в других методах. |
| 19 | Все файлы | Отсутствие JSDoc-аннотаций. Нет типов, что усложняет рефакторинг и поддержку. |
| 20 | Все файлы | Нет unit-тестов для core-логики (KanbanFilter, _moveCard, _reorderCardInColumn). |

---

## Changelog

### May 2026
- Modular architecture: separated storage, kanban components, bookmark modules
- chrome.storage.local for board data (avoids sync quota limits)
- Context menu now closes on scroll/resize
- Window.open replaced with safe a.click() for bookmark navigation
- CSS custom properties for bookmark grid dimensions
- Added Columns tab to settings page with drag-and-drop reorder
- Removed unused code (getBookmarkDragAfterElement, getCardDragAfterElement, dead CSS)
- Default tags/performers data centralized in kanban-constants.js
- Consolidated getDragAfterElement and getCardDragAfterElement into single parameterized function
- Removed dead CSS and orphaned JS
- Consolidated duplicate Escape keydown handler
- Widgets zone prepared in HTML/CSS for future expansion
- **Code review 2026-05-02**: identified 20 issues (3 critical bugs, 3 i18n gaps, 4 performance concerns, 2 sync race conditions, 4 UI/UX improvements, 4 structural debts)
