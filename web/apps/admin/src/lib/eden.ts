import { treaty } from "@elysiajs/eden";
import { getApiBaseUrl } from "@traceability/sdk";

const baseUrl = getApiBaseUrl(import.meta.env.VITE_API_BASE_URL);

export const eden = treaty(baseUrl);
