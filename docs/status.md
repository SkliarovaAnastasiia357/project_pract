# Teamnova Final MVP Status

Дата: 2026-06-01

## Current Phase

Финальный MVP приведен к формату защиты по кейсу: функциональное ядро реализовано, проект содержит темный фиолетовый UI, документы и презентацию. Текущий release pass добавляет judge-ready фичи без фиктивных чисел: live dashboard из реальных данных, объяснимый matching, демо-стенд с автоочисткой и отображение принятых кандидатов как команды проекта.

## Done

- Рабочая release branch содержит полный финальный MVP и свежий pass для защиты.
- Реализованы регистрация, вход, выход, восстановление mock-сессии и защита маршрутов.
- Реализованы профиль, описание, навыки, CRUD проектов, поиск проектов/участников и заявки на участие.
- Владелец проекта видит входящие заявки и принимает или отклоняет кандидатов.
- Главная страница показывает live dashboard из реальных API/mock данных: проекты, участники, входящие заявки, pending-заявки, принятые участники и навыки профиля.
- `/search` показывает объяснимый match score, рассчитанный из навыков профиля, стека/ролей проекта и поискового запроса.
- `/home` и `/requests` показывают принятых кандидатов как состав команды проекта.
- Добавлен демо-стенд для защиты: seed создает реальные проект, кандидатов и заявки; cleanup удаляет их вручную, а истекший демо-набор очищается автоматически по TTL.
- UI текущего приложения возвращен к темной фиолетовой системе Teamnova из старого макета: темный фон, purple accents, glowing brand mark, темные карточки, формы, кнопки, статусы и responsive layout.
- Исправлен visual overflow доски задач на desktop/mobile: колонки переносятся и не обрезаются.
- Финальный ручной MVP-cycle в mock-режиме пройден через Playwright дважды: desktop и mobile. Сценарий включает CRUD проекта, профиль/навыки, поиск, заявку, accept/reject и refresh защищенных маршрутов.
- Desktop screenshots проверены для `/login`, `/home`, `/profile`, `/projects/new`, project edit, `/search`, `/requests`.
- Mobile screenshots проверены для `/login`, `/home`, `/profile`, `/projects/new`, project edit, `/search`, `/requests`.
- Финальная презентация `docs/presentation/teamnova-final-sprint5.pptx` доведена до 10 слайдов, stale PR/push copy убран, PPTX integrity проверен.
- Docker/Nginx конфигурация для публикации есть в репозитории.

## Verification Evidence

- 2026-05-30 baseline в worktree:
  - `npm run build` прошел.
  - `npm run test:frontend` прошел.
  - `npm run test:backend` прошел локально: 31 passed, 49 skipped из-за Docker/testcontainers runtime caveat.
- 2026-05-30 после purple UI pass:
  - `npm run build` прошел.
  - `npm run test:frontend` прошел.
  - `npm run test:backend` прошел локально: 31 passed, 49 skipped из-за Docker/testcontainers runtime caveat.
- Ручные smoke screenshots сохранены локально в `/private/tmp/teamnova-purple-smoke/`.
- 2026-05-30 presentation gate:
  - `unzip -t docs/presentation/teamnova-final-sprint5.pptx` прошел.
  - PPTX содержит 10 слайдов и финальный slide gate.
- 2026-05-30 final manual gate:
  - Playwright desktop MVP-cycle прошел, screenshots: `/private/tmp/teamnova-final-smoke/desktop-final-*.png`.
  - Playwright mobile MVP-cycle прошел, screenshots: `/private/tmp/teamnova-final-smoke/mobile-final-*.png`.
  - Direct refresh проверен для `/home`, `/profile`, `/search`, `/requests`, `/projects/new` и project edit route; горизонтальный overflow = 0 на desktop и mobile.
- 2026-05-30 final automated gate прошел дважды:
  - `npm run test:frontend` прошел.
  - `npm run test:backend` прошел локально: 31 passed, 49 skipped из-за Docker/testcontainers runtime caveat.
  - `npm run build` прошел.
  - `npm run build:backend` прошел.
  - `npm run lint` прошел.
  - `npm run db:generate` прошел: No schema changes, nothing to migrate.
- 2026-06-01 judge-ready feature gate:
  - `npm run build` прошел.
  - `npm run test:frontend` прошел.
  - `npm run build:backend` прошел.
  - `npm run test:backend` прошел локально: 31 passed, 50 skipped из-за Docker/testcontainers runtime caveat.
  - `npm run lint` прошел.
  - `npm run db:generate` прошел: No schema changes, nothing to migrate.
- 2026-06-01 browser smoke в mock-режиме:
  - Desktop: demo seed создал реальные проект/3 кандидата/3 заявки; `/search` показал match explanation; `/requests` принял кандидата; `/home` показал его в составе команды; cleanup удалил demo data.
  - Protected refresh: прямое обновление `/requests` осталось на защищенном маршруте.
  - Mobile viewport: `/home` и `/search` с demo/match проверены, horizontal overflow = 0 / 0.
  - Скриншоты через in-app browser не сохранены из-за CDP timeout; проверка выполнена по DOM, текстовым состояниям и viewport overflow.

## Remaining External Checks

1. Проверить публичный DNS/hosting `teamnova.tw1.su` после получения доступа к внешней инфраструктуре.
2. На опубликованном стенде проверить `/healthz`, `/readyz` и SPA fallback для защищенных маршрутов.

## Known Limitations

- Локальная среда не предоставляет полноценный Docker/container runtime для всех backend integration suites; CI должен подтверждать container-based tests.
- Публичный домен `https://teamnova.tw1.su` из текущей среды не подтвержден. Фактическая DNS/hosting-проверка требует доступа к внешней инфраструктуре.

## Final Demo Scenario

1. Открыть приложение и показать темный фиолетовый Teamnova UI.
2. Зарегистрировать владельца проекта и попасть на `/home`.
3. Заполнить профиль и создать проект со стеком `React, TypeScript`.
4. Для быстрого судейского сценария нажать `Заполнить демо`: будут созданы реальные проект, 3 кандидата и 3 заявки.
5. Через `/search` найти проект и показать объяснение match score.
6. Открыть `/requests`, принять кандидата и показать его в команде проекта.
7. Вернуться на `/home`, проверить live dashboard и состав команды.
8. Очистить демо-данные кнопкой `Очистить` или оставить их на автоочистку по TTL.
9. Обновить protected route и подтвердить, что mock-сессия восстановилась.
