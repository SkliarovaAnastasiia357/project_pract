import assert from "node:assert/strict";

import { buildHomeTaskBoard } from "../../src/features/projects/project-board.ts";

export async function runProjectBoardTests(): Promise<void> {
  const board = buildHomeTaskBoard();

  assert.equal(board.length, 4, "главная доска должна состоять из четырех колонок");
  assert.equal(board[0]?.title, "Запланировано", "первая колонка должна содержать оставшиеся задачи финализации");
  assert.equal(board[0]?.tasks[0]?.title, "Финальная презентация", "первая задача должна быть финальной презентацией");
  assert.equal(board[1]?.tasks[0]?.title, "Комплексное тестирование", "QA должен быть активной задачей Спринта 5");
  assert.equal(board[1]?.tasks[1]?.title, "Исправление багов", "bugfix должен быть активной задачей Спринта 5");
  assert.equal(board[2]?.tasks[0]?.title, "Проверка релизной сборки", "релизная сборка должна быть на проверке");
  assert.equal(board[3]?.tasks[0]?.title, "MVP Спринта 4", "готовый функционал Спринта 4 должен быть в сделано");

  assert.equal(
    board.flatMap((column) => column.tasks).length,
    9,
    "доска Спринта 5 должна содержать компактный финальный план из 9 задач",
  );
}
