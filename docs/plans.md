# Teamnova MVP Execution Plan

Дата: 2026-05-12

## Scope

Довести актуальную ветку `main` до требований кейса: рабочий full-stack MVP с авторизацией, профилем, навыками, проектами, поиском пользователей/проектов и заявками на участие.

## Assumptions

- `origin/main` является актуальной базой: она содержит слитые ветки `frontend-sprint2-3-app` и `feat/sprint2-auth-final`.
- Поле `stack` проекта используется как список тегов/технологий для поиска проектов.
- Заявка может иметь статусы `pending`, `accepted`, `rejected`; повторная заявка в тот же проект не создается.
- Публичный хостинг уже указан в документации как `https://teamnova.tw1.su`; в этой итерации проверяется кодовая готовность, а не ручной деплой.

## Milestone 1: Data Model And Backend MVP API `[x]`

Goal: добавить реальные Fastify/Drizzle API для профилей, навыков, проектов, поиска и заявок.

Tasks:
- Расширить PostgreSQL-схему таблицами `skills`, `user_skills`, `projects`, `project_applications`.
- Добавить маршруты `/api/profile`, `/api/profile/skills`, `/api/projects`, `/api/search/projects`, `/api/search/users`, `/api/projects/:id/applications`.
- Подключить маршруты в backend entrypoint и test harness.
- Покрыть API backend-тестами.

Definition of done:
- API работает через реальную БД и требует авторизацию.
- Пользователь не может редактировать чужие проекты и принимать заявки не на свои проекты.
- Поиск возвращает проекты и пользователей по ключевым словам/навыкам.

Validation:
- `npm run test:backend`
- `npm run build:backend`

## Milestone 2: Frontend MVP Cycle `[x]`

Goal: расширить React UI для поиска и заявок, сохранив текущие сценарии auth/profile/projects.

Tasks:
- Расширить общий API-контракт, `mockApi` и `httpApi`.
- Добавить страницу поиска проектов/пользователей.
- Добавить страницу входящих заявок с accept/reject.
- Обновить навигацию, маршруты и состояния карточек.
- Покрыть mock/API UI-сценарии frontend-тестами.

Definition of done:
- Один пользователь создает проект.
- Второй пользователь заполняет профиль, находит проект и отправляет заявку.
- Владелец видит заявку и принимает/отклоняет ее.

Validation:
- `npm run test:frontend`
- `npm run build`

## Milestone 3: Documentation And Demo Readiness `[x]`

Goal: синхронизировать README, OpenAPI и чек-лист с финальным MVP.

Tasks:
- Обновить OpenAPI до версии MVP.
- Уточнить README: архитектура, стек, запуск, реализованные сценарии.
- Обновить тестовый чек-лист и статус выполнения модулей.
- Перенести задачи со скрина TeamProject на главную страницу приложения без служебных черновых подписей.

Definition of done:
- Документация описывает фактический код и команды запуска.
- Есть проверяемый демо-сценарий для Показов 3–4 и финальной защиты.

Validation:
- `npm test`
- `npm run build`

## Stop And Fix Rule

Если любой validation command падает, следующий шаг только диагностика и исправление причины. Новая функциональность не добавляется, пока текущий gate не пройдет.
