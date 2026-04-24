import { httpApi } from "./httpApi.ts";
import { mockApi } from "./mockApi.ts";

const mode = import.meta.env.VITE_API_MODE ?? "http";
export const apiClient = mode === "mock" ? mockApi : httpApi;
export { httpApi, mockApi };
