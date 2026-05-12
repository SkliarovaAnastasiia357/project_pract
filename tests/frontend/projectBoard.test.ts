import assert from "node:assert/strict";

import { buildHomeTaskBoard } from "../../src/features/projects/project-board.ts";

export async function runProjectBoardTests(): Promise<void> {
  const board = buildHomeTaskBoard();

  assert.equal(board.length, 4, "главная доска должна состоять из четырех колонок");
  assert.equal(board[0]?.title, "Запланировано", "первая колонка должна соответствовать TeamProject-доске");
  assert.equal(board[0]?.tasks[0]?.title, "чек-лист / тест-кейсы", "первая задача должна совпадать со скрином");
  assert.equal(board[1]?.tasks[1]?.title, "Обновление схемы БД", "задача БД должна быть в работе");
  assert.equal(board[1]?.tasks[2]?.title, "Реализовать api", "задача API должна быть в работе");
  assert.equal(board[2]?.tasks[2]?.title, "Обновление US +use case", "US/use case должны быть на проверке");
  assert.deepEqual(board[3]?.tasks, [], "колонка сделано на скрине пустая");

  assert.equal(
    board.flatMap((column) => column.tasks).length,
    10,
    "доска должна переносить все 10 видимых задач со скрина",
  );
}
