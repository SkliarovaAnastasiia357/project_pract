import { getContainerRuntimeClient } from "testcontainers";
import { describe } from "vitest";

async function detectContainerRuntime(): Promise<boolean> {
  try {
    await getContainerRuntimeClient();
    return true;
  } catch {
    return false;
  }
}

export const hasContainerRuntime = await detectContainerRuntime();
export const describeWithContainers = hasContainerRuntime ? describe : describe.skip;
