import assert from "node:assert/strict";

import { routePaths } from "../../src/app/routePaths.ts";
import { routeScrollReset } from "../../src/shared/navigation.ts";

export async function runAppRoutesTests(): Promise<void> {
  assert.deepEqual(
    routePaths,
    [
      "/",
      "/login",
      "/register",
      "/home",
      "/profile",
      "/search",
      "/requests",
      "/projects/new",
      "/projects/:id/edit",
      "/projects/:id/candidates",
    ],
    "роутер должен содержать все пути MVP",
  );
  assert.deepEqual(
    routeScrollReset,
    { top: 0, left: 0, behavior: "auto" },
    "новый экран должен открываться с начала страницы после перехода по SPA-маршруту",
  );
}
