# Dating Admin — панель управления сайтом знакомств

Админка для [dating-api](../dating-api-main) (Laravel 13 API). Next.js 16
App Router, React 19, TypeScript, Tailwind CSS 4, TanStack Query 5.

## Быстрый старт

Пакетный менеджер — **pnpm** (конфиг `pnpm-workspace.yaml` разрешает
build-скрипты зависимостей, напр. `unrs-resolver`):

```bash
pnpm install
cp .env.example .env   # заполнить Reverb-ключи и адрес API
pnpm dev               # http://localhost:3001
```

API должен быть поднят на `http://localhost:8000` (см. `API_URL_INTERNAL`
в `.env.example` и рерайты в `next.config.ts`).

## Скрипты

| Команда | Действие |
|---|---|
| `pnpm dev` | Dev-сервер на порту 3001 |
| `pnpm build` | Production-сборка |
| `pnpm start` | Production-сервер |
| `pnpm lint` | ESLint (flat config) |

## Структура проекта

```
app/
  (admin)/                 — все страницы панели (route group c общим layout)
    dashboard/             — главная: KPI, графики, ленты
    users/                 — список юзеров + /users/[id] (19 табов карточки)
    moderation/            — фото, комменты фото/дневников, дневники,
                             жалобы, знакомства (свайпы/мэтчи)
    security/              — антифрод (fraud alerts), сигналы блокировок
    communication/         — чаты, поддержка, шаблоны ответов, стоп-слова
    finance/               — транзакции, тарифы, подарки
    system/                — блог, страницы, медиа, рассылки, роли,
                             настройки, логи, GeoIP, аудит
  login/                   — авторизация (Sanctum cookie-сессии)
components/
  ui/                      — примитивы (button, table, dialog, ...)
  admin/                   — общие компоненты админки:
    list-pagination.tsx    — большая пагинация списков (единый алгоритм)
    status-tabs.tsx        — кнопки-фильтры статусов со счётчиками
    search-input.tsx       — поиск с лупой и крестиком
    page-header.tsx        — шапка страницы (назад/иконка/заголовок/обновить)
    table-states.tsx       — строки загрузки/пусто для таблиц
    tab-states.tsx         — TabLoading/TabError для табов юзера
    mini-pagination.tsx    — компактная пагинация для табов юзера
    user-badge.tsx         — карточка юзера (аватар, статусы, VIP/Premium)
    confirm-dialog.tsx     — диалог подтверждения действия
hooks/
  use-debounced-value.ts   — debounce (пустая строка проходит мгновенно)
  use-url-sync.ts          — синхронизация query-параметров с URL
  use-tab-url.ts           — URL-состояние табов /users/[id]
  admin/                   — TanStack Query-хуки по доменам
lib/
  api.ts                   — axios-клиент: 401-редирект, CSRF-retry (419),
                             extractErrorMessage/extractValidationErrors
  api/                     — типизированные методы API по доменам
  api/users.ts             — включая 13 per-user листингов табов юзера
  types.ts                 — общие типы (+ LaravelPaginated<T>, ListMeta)
  constants.ts             — SEARCH_DEBOUNCE_MS и др. (единственный источник)
  format.ts                — formatDate/Time/DateTime/RelativeTime, pluralizeRu
store/                     — zustand (auth-store)
config/                    — справочники бейджей статусов, медиа-коллекций
docs/                      — dev-заметки и документация компонентов
```

## Архитектурные конвенции

- **Данные**: TanStack Query. Хуки — в `hooks/admin/use-<домен>.ts`,
  API-методы — в `lib/api/<домен>.ts`. Query-ключи документированы
  в шапке каждого хук-файла; мутации инвалидируют ключи по префиксу.
- **Списки**: единая пагинация `ListPagination`, статус-табы `StatusTabs`,
  поиск `SearchInput`, состояния таблиц `TableLoadingRow/TableEmptyRow`.
  Новые списочные страницы обязаны использовать эти примитивы, а не
  копировать разметку (см. `moderation/reports` как образец).
- **Табы юзера**: состояние в URL (`hooks/admin/use-tab-url.ts`),
  `TabLoading/TabError`, `MiniPagination`. Per-user данные —
  `UserListingsController` на бэкенде, хуки `useUser*` в `use-users.ts`.
- **Ошибки API**: `extractErrorMessage(err, fallback)` для тостов,
  `extractValidationErrors(err)` для форм. Порядок проверки:
  `isValidationError → isApiError → isNetworkError`.
- **Картинки**: медиа отдаются с домена бэкенда — используется `<img>`
  с eslint-disable, next/image не применим.

## Связанные репозитории

- **dating-api** — Laravel API. Рефакторинг и структура описаны в его
  `REFACTORING.md` и `docs/`.
