import { SignJWT, jwtVerify, type JWTPayload } from "jose";

// ─── Config ─────────────────────────────────────────────

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "change-me-jwt-secret"
);
const REFRESH_SECRET = new TextEncoder().encode(
  process.env.REFRESH_TOKEN_SECRET ?? "change-me-refresh-secret"
);

const ACCESS_TOKEN_TTL = "45m"; // Bible §08
const REFRESH_TOKEN_TTL = "16h"; // Bible §08

// ─── Payload types ──────────────────────────────────────

export interface AccessTokenPayload extends JWTPayload {
  userId: string;
  username: string;
  roles: string[];
}

export interface RefreshTokenPayload extends JWTPayload {
  userId: string;
  tokenId: string; // maps to refresh_tokens.id for rotation
}

// ─── Sign ───────────────────────────────────────────────

export async function signAccessToken(payload: {
  userId: string;
  username: string;
  roles: string[];
}): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .sign(JWT_SECRET);
}

export async function signRefreshToken(payload: {
  userId: string;
  tokenId: string;
}): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_TTL)
    .sign(REFRESH_SECRET);
}

// ─── Verify ─────────────────────────────────────────────

export async function verifyAccessToken(
  token: string
): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify(token, JWT_SECRET);
  return payload as AccessTokenPayload;
}

export async function verifyRefreshToken(
  token: string
): Promise<RefreshTokenPayload> {
  const { payload } = await jwtVerify(token, REFRESH_SECRET);
  return payload as RefreshTokenPayload;
}

// ─── Device Token ───────────────────────────────────────

const DEVICE_SECRET = new TextEncoder().encode(
  process.env.DEVICE_TOKEN_SECRET ?? "change-me-device-secret"
);
const DEVICE_TOKEN_TTL = "365d"; // long-lived kiosk token

export interface DeviceTokenPayload extends JWTPayload {
  deviceId: string;
}

export async function signDeviceToken(payload: {
  deviceId: string;
}): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(DEVICE_TOKEN_TTL)
    .sign(DEVICE_SECRET);
}

export async function verifyDeviceToken(
  token: string
): Promise<DeviceTokenPayload> {
  const { payload } = await jwtVerify(token, DEVICE_SECRET);
  return payload as DeviceTokenPayload;
}
