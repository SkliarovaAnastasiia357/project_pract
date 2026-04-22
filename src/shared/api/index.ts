import { httpApi } from "./httpApi.ts";
import { mockApi } from "./mockApi.ts";

export const apiClient = import.meta.env.VITE_API_MODE === "http" ? httpApi : mockApi;

export { httpApi, mockApi };
