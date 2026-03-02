import { QueryKey } from "@tanstack/react-query";

export type MaterialScope = "admin" | "production" | "store";

type QueryKeyFactory = {
  requests: () => QueryKey;
  request: (id?: string | null) => QueryKey;
  issueOptions: (id?: string | null) => QueryKey;
  pendingRequests: () => QueryKey;
  nextNumbers: () => QueryKey;
  catalog: () => QueryKey;
  meta: () => QueryKey;
};

export function createMaterialQueryKeys(scope: MaterialScope): QueryKeyFactory {
  const root = `material-${scope}`;
  return {
    requests: () => [root, "requests"],
    request: (id) => [root, "request", id ?? ""],
    issueOptions: (id) => [root, "issue-options", id ?? ""],
    pendingRequests: () => [root, "pending"],
    nextNumbers: () => [root, "next-numbers"],
    catalog: () => [root, "catalog"],
    meta: () => [root, "meta"],
  };
}
