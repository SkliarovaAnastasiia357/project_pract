# Sprint 5 Final QA Checklist

Дата: 2026-06-01
Период: 15.05.2026–28.05.2026

## Automated Gates

- [x] `npm run test:frontend`
- [x] `npm run build`
- [x] `npm run lint`
- [x] `npm run test:backend` локально: unit suites прошли, integration suites пропущены без Docker runtime
- [x] `npm run build:backend`
- [x] `npm run db:generate`
- [x] GitHub Actions `test` passed на PR #9
- [x] 2026-06-01: `npm run test:frontend` подтверждает match score и mock demo seed/cleanup.
- [x] 2026-06-01: `npm run test:backend` подтверждает backend contract; локально 31 passed / 50 skipped из-за Docker/testcontainers caveat.
- [x] 2026-06-01: `npm run build` и `npm run build:backend` проходят после dashboard/demo/matching изменений.

## Browser Smoke

- [x] Mock frontend поднят через Vite.
- [x] Регистрация открывает `/home`.
- [x] Прямой переход на `/projects/new` восстанавливает mock-сессию и не возвращает на `/login`.
- [x] `/home` показывает список проектов пользователя, а не внутреннюю доску задач проекта Teamnova.
- [x] Полный MVP-цикл подтвержден frontend contract test `mvpCycle.test.ts`.
- [x] Полный form-entry browser smoke пройден через Playwright дважды: desktop owner -> project CRUD -> member -> search -> application -> owner accept/reject и mobile owner -> project CRUD -> member -> search -> application -> owner accept/reject.
- [x] Protected route refresh проверен для `/home`, `/profile`, `/search`, `/requests`, `/projects/new` и project edit route.
- [x] `/home`: live dashboard показывает реальные счетчики из mock/API, а не статичные презентационные числа.
- [x] `/home`: кнопка `Заполнить демо` создает реальные проект, кандидатов и заявки; `Очистить` удаляет демо-набор.
- [x] `/search`: карточки проектов показывают объяснимый match score по профилю, проекту и запросу.
- [x] `/requests`: принятие заявки добавляет участника в команду проекта.

## UI/UX Review

- [x] Главная страница обновлена под пользовательский сценарий управления проектами.
- [x] Старые подписи `Показ 4`, `Profile bio`, `Skills`, `Applications` убраны из пользовательских экранов.
- [x] Форма проекта описана пользовательским языком, без технического упора на mock/backend contract.
- [x] Быстрый desktop smoke для `/home` и `/projects/new`.
- [x] Темный фиолетовый Teamnova UI восстановлен по старому макету.
- [x] Desktop layout smoke для `/login`, `/home`, `/profile`, `/projects/new`, project edit, `/search`, `/requests`.
- [x] Mobile layout smoke для `/login`, `/home`, `/profile`, `/projects/new`, project edit, `/search`, `/requests`.
- [x] Judge-ready widgets проверены на desktop и mobile: live dashboard, demo controls, match panel, team strip. Mobile horizontal overflow: 0 / 0.

## Documentation

- [x] `docs/plans.md` обновлен под Спринт 5.
- [x] `docs/status.md` фиксирует QA baseline, баг и ограничения хостинга.
- [x] `docs/test-plan.md` описывает финальные gates.
- [x] `docs/README.md` обновлен под финальную версию.
- [x] `docs/testing/test-cases.md` обновлен с учетом session restore и главной страницы со списком проектов.
- [x] Финальная презентация доведена до 10-15 слайдов и проверена через PPTX integrity.

## Release / Hosting

- [x] Docker/Nginx файлы есть в репозитории.
- [ ] Публичный домен `teamnova.tw1.su` резолвится из внешней среды.
- [ ] `/healthz` доступен на опубликованном стенде.
- [ ] `/readyz` доступен на опубликованном стенде.
- [ ] SPA fallback открывает защищенные маршруты после публикации.

## Known Limitations

- Локальная среда не дает Docker runtime, поэтому backend integration suites требуют CI.
- `teamnova.tw1.su` не резолвится из текущей среды; финальная DNS/hosting-проверка требует доступа к внешней инфраструктуре.
- Ручной browser smoke выполнялся через Playwright screenshots в mock-режиме; публикация на внешнем домене проверяется отдельно после получения инфраструктурного доступа.
