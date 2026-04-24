import { runAppRoutesTests } from "./appRoutes.test.ts";
import { runHttpApiTests } from "./httpApi.test.ts";
import { runMockApiTests } from "./mockApi.test.ts";
import { runWorkspaceSummaryTests } from "./workspaceSummary.test.ts";

try {
  await runAppRoutesTests();
  await runMockApiTests();
  await runWorkspaceSummaryTests();
  await runHttpApiTests();
  console.log("Frontend tests passed.");
} catch (error) {
  console.error("Frontend tests failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
