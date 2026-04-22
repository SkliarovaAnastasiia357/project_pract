import { runFrontendTests } from "./authMvp.test.ts";
import { runAppRoutesTests } from "./appRoutes.test.ts";
import { runMockApiTests } from "./mockApi.test.ts";
import { runWorkspaceSummaryTests } from "./workspaceSummary.test.ts";

try {
  await runFrontendTests();
  await runAppRoutesTests();
  await runMockApiTests();
  await runWorkspaceSummaryTests();
  console.log("Frontend tests passed.");
} catch (error) {
  console.error("Frontend tests failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
