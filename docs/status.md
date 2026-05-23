# Teamnova Sprint 5 Status

Дата: 2026-05-16

## Current Phase

Финализация Спринта 5 реализована локально. Идет подготовка commit, push и draft PR.

## Done

- Подтверждена актуальная ветка: `sprint4-search-applications`.
- Рабочее дерево перед стартом было чистым.
- `npm run test:frontend` прошел.
- `npm run build` прошел.
- `npm run lint` прошел.
- `npm run build:backend` прошел.
- `npm run db:generate` прошел: `No schema changes, nothing to migrate`.
- `npm test` прошел: frontend passed; backend 31 passed, 49 skipped из-за локальной недоступности container runtime.
- `npm run test:backend` прошел частично: 31 passed, 49 skipped из-за локальной недоступности container runtime для testcontainers.
- Локальный mock-сайт поднят через Vite на `http://127.0.0.1:5174/`.
- Browser smoke подтвердил регистрацию и автологин до `/home`.
- Выявлен UX/демо-долг: главная страница всё еще описывает Спринт 4 и даты 01.05–14.05 вместо финального Спринта 5.
- Выявлен баг mock-демо: после прямого перехода/перезагрузки защищенного URL приложение возвращает на `/login`, хотя mock database хранит активную session.
- Исправлен баг восстановления mock-сессии через единый `ApiClient.restoreSession`.
- Добавлен regression-тест `mockApi.restoreSession`.
- Главная страница, auth-экраны, профиль, поиск, заявки и форма проекта очищены от устаревших/черновых текстов.
- Доска задач на главной обновлена под Спринт 5.
- Добавлен `docs/testing/SPRINT5_TEST_CHECKLIST.md`.
- Создана финальная презентация `docs/presentation/teamnova-final-sprint5.pptx` на 9 слайдов.
- PPTX проверен через `unzip -t`; Quick Look thumbnail первого слайда сгенерировался без ошибки.
- Проверка публичного URL `https://teamnova.tw1.su` из локальной среды завершилась ошибкой DNS resolve.

## In Progress

- Commit, push и draft PR.

## Next

1. Проверить итоговый `git diff`.
2. Запустить `npm test` как pre-commit equivalent.
3. Commit, push, draft PR в production-ready базу.

## Decisions

- Архитектура backend, БД и auth/security model не меняются.
- Восстановление сессии добавляется на уровне frontend API contract:
  - `httpApi` продолжает использовать `/api/auth/refresh`.
  - `mockApi` восстанавливает активную mock-сессию из localStorage.
- Если в remote нет веток `prod`/`production`, PR создается в `main`.

## Assumptions

- Docker недоступен локально; backend integration suites должны подтверждаться в CI.
- Для фактического деплоя на внешний хостинг могут потребоваться доступы к VDS/DNS, которых нет в локальном репозитории.

## Commands

- `npm run test:frontend`
- `npm run test:backend`
- `npm run build`
- `npm run lint`
- `VITE_API_MODE=mock npm run dev -- --host 127.0.0.1 --port 5173`
- `curl -I --max-time 15 https://teamnova.tw1.su`

## Blockers

- Локально недоступен Docker/container runtime для полной backend integration-проверки.
- Публичный домен `teamnova.tw1.su` не резолвится из текущей среды; публикация на хостинге требует внешнего доступа/проверки DNS.

## Audit Log

- 2026-05-12: реализован Спринт 4: поиск проектов/пользователей и заявки.
- 2026-05-16: стартован Спринт 5 финализации: QA, багфиксы, UI/UX, документация, презентация, publish flow.
- 2026-05-16: базовые проверки frontend/build/lint зелёные; backend tests частично skipped из-за инфраструктуры.
- 2026-05-16: найден баг восстановления mock-сессии при прямом URL.
- 2026-05-16: баг mock-session restore исправлен и покрыт regression-тестом.
- 2026-05-16: финальная документация и презентация добавлены в репозиторий.
- 2026-05-16: release gate локально пройден: frontend, backend unit, build, backend build, lint, db:generate.

## Smoke Demo Checks

- Регистрация, вход, refresh/restore, выход.
- Заполнение bio и навыков.
- CRUD проекта.
- Поиск проекта по стеку/ключевым словам.
- Поиск пользователя по навыку.
- Отправка заявки участником.
- Просмотр и accept/reject заявки владельцем проекта.
- Прямой переход на protected route после восстановления mock-сессии.

## Browser Smoke Notes

- Targeted browser smoke подтвердил `/projects/new` после восстановления mock-сессии и обновленную `/home` доску Спринта 5.
- Полный form-entry smoke через in-app browser не завершен: Browser Use заблокировал `javascript:` URL workaround, а прямой ввод в поля был нестабилен из-за CDP/virtual clipboard. Полный MVP-цикл покрыт `tests/frontend/mvpCycle.test.ts`.
