# Sprint 5 Final QA Checklist

Дата: 2026-05-16
Период: 15.05.2026–28.05.2026

## Automated Gates

- [x] `npm run test:frontend`
- [x] `npm run build`
- [x] `npm run lint`
- [x] `npm run test:backend` локально: unit suites прошли, integration suites пропущены без Docker runtime
- [x] `npm run build:backend`
- [x] `npm run db:generate`
- [ ] GitHub Actions после push/PR

## Browser Smoke

- [x] Mock frontend поднят через Vite.
- [x] Регистрация открывает `/home`.
- [x] Прямой переход на `/projects/new` восстанавливает mock-сессию и не возвращает на `/login`.
- [x] `/home` показывает Спринт 5 и финальную доску задач.
- [x] Полный MVP-цикл подтвержден frontend contract test `mvpCycle.test.ts`.
- [ ] Полный form-entry browser smoke через in-app browser.

## UI/UX Review

- [x] Главная страница обновлена под финальный Спринт 5.
- [x] Старые подписи `Показ 4`, `Profile bio`, `Skills`, `Applications` убраны из пользовательских экранов.
- [x] Форма проекта описана пользовательским языком, без технического упора на mock/backend contract.
- [x] Быстрый desktop smoke для `/home` и `/projects/new`.
- [ ] Mobile layout smoke перед финальным merge.

## Documentation

- [x] `docs/plans.md` обновлен под Спринт 5.
- [x] `docs/status.md` фиксирует QA baseline, баг и ограничения хостинга.
- [x] `docs/test-plan.md` описывает финальные gates.
- [x] `docs/README.md` обновлен под финальную версию.
- [x] `docs/testing/test-cases.md` обновлен с учетом session restore и Sprint 5 board.
- [x] Финальная презентация создана и проверена через PPTX integrity + Quick Look thumbnail.

## Release / Hosting

- [x] Docker/Nginx файлы есть в репозитории.
- [ ] Публичный домен `teamnova.tw1.su` резолвится из внешней среды.
- [ ] `/healthz` доступен на опубликованном стенде.
- [ ] `/readyz` доступен на опубликованном стенде.
- [ ] SPA fallback открывает защищенные маршруты после публикации.

## Known Limitations

- Локальная среда не дает Docker runtime, поэтому backend integration suites требуют CI.
- `teamnova.tw1.su` не резолвится из текущей среды; финальная DNS/hosting-проверка требует доступа к внешней инфраструктуре.
- Полный browser form-entry smoke не завершен из-за нестабильного CDP/virtual clipboard в in-app browser; полный сценарий защищен frontend contract test.
