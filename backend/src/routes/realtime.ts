import Elysia, { t } from "elysia";
import { type AccessTokenPayload, verifyAccessToken } from "../lib/jwt";
import { createSseStream, REALTIME_CHANNELS } from "../lib/realtime";
import { fail } from "../lib/http";

function hasAnyRole(user: AccessTokenPayload | null, roles: string[]) {
  if (!user) return false;
  return roles.some((r) => user.roles?.includes(r));
}

export const realtimeRoutes = new Elysia({ prefix: "/realtime" }).get(
  "/material-requests",
  async ({
    query,
    request,
    set,
  }: {
    query: { access_token?: string };
    request: Request;
    set: any;
  }) => {
    const authHeader = request.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
    const accessToken = query.access_token || bearerToken;

    if (!accessToken) {
      set.status = 401;
      return fail("UNAUTHORIZED", "Authentication required");
    }

    let user: AccessTokenPayload | null = null;
    try {
      user = await verifyAccessToken(accessToken);
    } catch {
      set.status = 401;
      return fail("UNAUTHORIZED", "Authentication required");
    }

    if (!hasAnyRole(user, ["PRODUCTION", "OPERATOR", "STORE", "SUPERVISOR", "ADMIN"])) {
      set.status = 403;
      return fail("FORBIDDEN", "No permission for material realtime stream");
    }

    const { stream } = createSseStream(REALTIME_CHANNELS.MATERIAL_REQUESTS);
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  },
  {
    query: t.Object({
      access_token: t.Optional(t.String()),
    }),
  }
);
