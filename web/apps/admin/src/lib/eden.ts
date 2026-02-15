import { treaty } from "@elysiajs/eden";

const baseUrl = String(import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");

export const eden = treaty(baseUrl);
