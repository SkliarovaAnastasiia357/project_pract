import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const testEntry = resolve(currentDirectory, "run-frontend-tests.ts");
const localTsxBinary = resolve(currentDirectory, "../../node_modules/.bin/tsx");
const nodeMajorVersion = Number.parseInt(process.versions.node.split(".")[0], 10);

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  });

  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }

  process.exit(result.status ?? 0);
}

if (nodeMajorVersion >= 22) {
  run(process.execPath, ["--experimental-strip-types", testEntry]);
}

if (existsSync(localTsxBinary)) {
  run(localTsxBinary, [testEntry]);
}

run("npx", ["-y", "node@22", "--experimental-strip-types", testEntry]);
