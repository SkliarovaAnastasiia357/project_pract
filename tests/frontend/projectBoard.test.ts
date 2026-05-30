import assert from "node:assert/strict";

import { buildHomeTaskBoard } from "../../src/features/projects/project-board.ts";

export async function runProjectBoardTests(): Promise<void> {
  const board = buildHomeTaskBoard();

  assert.equal(board.length, 4, "главная доска должна состоять из четырех колонок");
  assert.equal(board[0]?.title, "Внешняя проверка", "первая колонка должна содержать внешние deployment checks");
  assert.equal(board[0]?.tasks[0]?.title, "Проверка хостинга", "хостинг должен оставаться внешней проверкой");
  assert.equal(board[1]?.tasks[0]?.title, "Автоматические проверки", "release gate должен быть активной задачей");
  assert.equal(board[1]?.tasks[1]?.title, "Ручной MVP-cycle", "ручной MVP-cycle должен быть активной задачей");
  assert.equal(board[2]?.tasks[0]?.title, "Темный Teamnova UI", "финальный дизайн должен быть готов к сдаче");
  assert.equal(board[2]?.tasks[1]?.title, "Презентация 10 слайдов", "презентация должна быть готова к сдаче");
  assert.equal(board[3]?.tasks[0]?.title, "MVP Спринта 4", "готовый функционал Спринта 4 должен быть в сделано");

  assert.equal(
    board.flatMap((column) => column.tasks).length,
    9,
    "доска Спринта 5 должна содержать компактный финальный план из 9 задач",
  );
}
