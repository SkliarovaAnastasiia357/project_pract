# Кейс: Разработка цифровой платформы для подбора участников и формирования команд

![Tests](https://github.com/SkliarovaAnastasiia357/project_pract/actions/workflows/tests.yml/badge.svg?branch=qa)

## Команда проекта

- Разуваев Максим Александрович, дизайнер
- Толошный Захар Павлович, backend-разработчик
- Мусиенко Матвей Валерьевич, frontend-разработчик
- Скляр Александр Максимович, тестировщик
- Склярова Анастасия Андреевна, TL/PM

---

## Концепция продукта

Описание проекта и user stories находятся в папке [UserStories](./UserStories):

- [description.md](./UserStories/description.md)
- [User_Stories_forMVP (2).pdf](./UserStories/User_Stories_forMVP%20(2).pdf)

---

## Технологический стек

**Frontend:** React + TypeScript + CSS  
**Backend:** Go (Golang)  
**База данных:** PostgreSQL

---

## Преимущества выбранного тех. стека

### React

Обеспечивает создание динамичного и отзывчивого интерфейса. Позволяет удобно масштабировать проект за счет компонентного подхода.

### TypeScript

Добавляет строгую типизацию, снижает количество ошибок и упрощает поддержку кода в долгосрочной перспективе.

### CSS

Гибко управляет стилями и адаптивностью интерфейса, позволяет создавать удобный и современный UI.

### Golang

Высокая производительность и эффективная работа с конкурентностью. Хорошо подходит для масштабируемых веб-сервисов.

### PostgreSQL

Надежная реляционная база данных с поддержкой сложных запросов, высокой целостностью данных и хорошей производительностью.

---

## Структура проекта

- `UserStories/` — описание проекта и PDF с user stories
- `tests/frontend/` — frontend-тесты
- `tests/backend/` — backend-тесты
- `docs/MODULE_PROGRESS.md` — файл для отметки выполнения модулей
- `.github/workflows/tests.yml` — запуск тестов в GitHub Actions
- `.githooks/pre-commit` — проверка тестов перед коммитом

---

## Установка и запуск

1. Установить `Node.js` и `Go`.
2. Установить npm-зависимости:

```powershell
npm install
```

3. Подключить git hook:

```powershell
npm run setup:hooks
```

4. Запустить тесты:

```powershell
npm run test:frontend
npm run test:backend
```

Общий запуск:

```powershell
npm test
```

---

## Статус тестов

- Frontend-тесты запускаются командой `npm run test:frontend`
- Backend-тесты запускаются командой `npm run test:backend`
- Перед коммитом тесты проверяются через `pre-commit`
- В GitHub статус тестов отображается через workflow `Tests`

Важно: backend-тесты требуют установленный `Go`. Если `Go` не установлен, локально пройдет только frontend-часть.
