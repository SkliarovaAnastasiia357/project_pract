# Teamnova MVP Status

Дата: 2026-05-12

## Current Phase

MVP-доработка Спринта 4 реализована, идет публикация PR.

## Done

- Выполнен `git fetch --all --prune --tags`.
- Проверены remote-ветки: `origin/main`, `origin/frontend-sprint2-3-app`, `origin/feat/sprint2-auth-final`.
- Локальная ветка `main` переключена и fast-forward обновлена до `origin/main` (`931d4b9`).
- Выявлен главный разрыв: frontend mock умеет профиль/проекты, backend пока реализует только auth, `/api/me` и health.
- Добавлены backend-таблицы и API для профилей, навыков, проектов, поиска и заявок.
- Добавлены UI-страницы `/search` и `/requests`.
- Обновлены README, OpenAPI, чек-листы и статус модулей.
- Главная страница теперь показывает задачи со скрина TeamProject: чек-лист/тест-кейсы, макеты, БД, API, страницы компонентов, аналитика, документация и US/use case.
- Из пользовательского интерфейса убраны черновые англоязычные подписи и служебные заглушки.
- `npm test` прошел: frontend passed; backend 31 passed, 49 skipped локально из-за отсутствия Docker runtime для testcontainers.
- `npm run build` прошел.
- `npm run lint` прошел.
- Browser smoke в mock-режиме прошел: участник нашел проект, отправил заявку, владелец принял ее на `/requests`.
- `npm run db:generate` после добавления Drizzle snapshot сообщает `No schema changes, nothing to migrate`.

## In Progress

- Публикация ветки и PR в `main`.

## TeamProject Tasks From Screenshot

- Запланировано: `чек-лист / тест-кейсы`, `Макеты страниц, компонентов`.
- В работе: `Ведение доски задач`, `Обновление схемы БД`, `Реализовать api`, `Редактирование согласно дизайну`, `Создание страниц компонентов`.
- На проверке: `Обновление аналитики`, `оформить папку документации, гитхаб`, `Обновление US +use case`.
- Сделано: колонка оставлена пустой, как на скрине.

## Next

- Дождаться GitHub Actions: в CI container-based backend suites теперь запускаются, а не пропускаются.

## Decisions

- Актуальная база разработки: `main`.
- Теги проекта трактуются как элементы поля `stack`.
- Для заявок используются статусы `pending`, `accepted`, `rejected`.

## Assumptions

- Публичный хостинг уже настроен отдельно; локальная задача — довести код и документацию.
- Docker недоступен в текущей локальной среде; CI должен подтвердить backend integration-тесты с testcontainers.

## Commands

- `git fetch --all --prune --tags`
- `git switch main`
- `git pull --ff-only origin main`
- `npm run test:frontend`
- `npm run build:backend`
- `npm test`
- `npm run build`
- `npm run lint`
- `npm run db:generate`
- `VITE_API_MODE=mock npm run dev -- --host 127.0.0.1 --port 5173`

## Blockers

- Локальный Docker runtime недоступен, поэтому backend integration suites подтверждаются через CI.

## Audit Log

- 2026-05-12: предыдущая проверка была только по `frontend-sprint2-3-app`; после полной проверки выбрана `origin/main`.
- 2026-05-12: создан execution pack для MVP-доработки.
- 2026-05-12: реализован Спринт 4: поиск проектов/пользователей и заявки.
- 2026-05-12: browser smoke подтвердил MVP-цикл на `http://127.0.0.1:5173/`.
- 2026-05-12: CI-настройка testcontainers изменена так, чтобы в CI отсутствие Docker не давало тихий skip.

## Smoke Demo Checks

- Регистрация, вход, refresh, выход.
- Заполнение bio и навыков.
- CRUD проекта.
- Поиск проекта по стеку/ключевым словам.
- Поиск пользователя по навыку.
- Отправка заявки участником.
- Просмотр и accept/reject заявки владельцем проекта.
