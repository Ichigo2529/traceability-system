declare global {
  interface ImportMeta {
    env: Record<string, string | boolean | undefined>;
  }
}
export {};
