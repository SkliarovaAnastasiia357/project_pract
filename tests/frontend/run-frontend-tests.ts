import { runFrontendTests } from "./authMvp.test.ts";

try {
  runFrontendTests();
  console.log("Frontend tests passed.");
} catch (error) {
  console.error("Frontend tests failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
