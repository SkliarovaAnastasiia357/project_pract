import assert from "node:assert/strict";

import { routePaths } from "../../src/app/routePaths.ts";

export async function runAppRoutesTests(): Promise<void> {
  assert.deepEqual(
    routePaths,
    ["/", "/login", "/register", "/home", "/profile", "/projects/new", "/projects/:id/edit"],
    "роутер должен содержать все пути для спринтов 2 и 3",
  );
}
