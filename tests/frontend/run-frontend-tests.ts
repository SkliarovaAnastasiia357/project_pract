import { runAppRoutesTests } from "./appRoutes.test.ts";
import { runHttpApiTests } from "./httpApi.test.ts";
import { runMockApiTests } from "./mockApi.test.ts";
import { runMvpCycleTests } from "./mvpCycle.test.ts";
import { runProjectBoardTests } from "./projectBoard.test.ts";
import { runProfileChecklistTests } from "./profileChecklist.test.ts";
import { runProjectsChecklistTests } from "./projectsChecklist.test.ts";
import { runSprint3RegressionTests } from "./sprint3Regression.test.ts";
import { runWorkspaceSummaryTests } from "./workspaceSummary.test.ts";

try {
  await runAppRoutesTests();
  await runMockApiTests();
  await runMvpCycleTests();
  await runProjectBoardTests();
  await runProfileChecklistTests();
  await runProjectsChecklistTests();
  await runSprint3RegressionTests();
  await runWorkspaceSummaryTests();
  await runHttpApiTests();
  console.log("Frontend tests passed.");
} catch (error) {
  console.error("Frontend tests failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
