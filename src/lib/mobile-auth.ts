import { NextRequest } from "next/server";
import { prisma } from "./prisma";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MobileUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

interface JwtPayload {
  sub: string;
  iat: number;
  exp: number;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Base64url helpers (Edge-compatible, no node:crypto)
// ---------------------------------------------------------------------------

function base64urlEncode(data: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlEncodeString(str: string): string {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(str: string): Uint8Array {
  // Restore standard base64
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  // Pad to multiple of 4
  while (base64.length % 4 !== 0) {
    base64 += "=";
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ---------------------------------------------------------------------------
// HMAC-SHA256 key derivation (Web Crypto)
// ---------------------------------------------------------------------------

async function getSigningKey(): Promise<CryptoKey> {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET environment variable is not set");
  }
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

// ---------------------------------------------------------------------------
// signMobileJwt
// ---------------------------------------------------------------------------

/**
 * Signs a JWT using HMAC-SHA256 via the Web Crypto API.
 *
 * @param payload - Claims to include (must contain `sub` at minimum)
 * @param expiresInSeconds - Token lifetime in seconds (default: 7 days)
 * @returns base64url-encoded JWT string
 */
export async function signMobileJwt(
  payload: Record<string, unknown>,
  expiresInSeconds: number = 7 * 24 * 60 * 60
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: "HS256", typ: "JWT" };
  const fullPayload: JwtPayload = {
    ...payload,
    sub: payload.sub as string,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const headerB64 = base64urlEncodeString(JSON.stringify(header));
  const payloadB64 = base64urlEncodeString(JSON.stringify(fullPayload));
  const signingInput = `${headerB64}.${payloadB64}`;

  const key = await getSigningKey();
  const encoder = new TextEncoder();
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(signingInput)
  );
  const signatureB64 = base64urlEncode(new Uint8Array(signatureBuffer));

  return `${signingInput}.${signatureB64}`;
}

// ---------------------------------------------------------------------------
// verifyMobileJwt
// ---------------------------------------------------------------------------

/**
 * Verifies a JWT and returns the decoded payload, or null if invalid/expired.
 */
export async function verifyMobileJwt(
  token: string
): Promise<JwtPayload | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;
    const signingInput = `${headerB64}.${payloadB64}`;

    // Verify signature
    const key = await getSigningKey();
    const encoder = new TextEncoder();
    const signatureBytes = base64urlDecode(signatureB64);
    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes as BufferSource,
      encoder.encode(signingInput)
    );
    if (!isValid) return null;

    // Decode payload
    const payloadJson = new TextDecoder().decode(base64urlDecode(payloadB64));
    const payload = JSON.parse(payloadJson) as JwtPayload;

    // Check expiry
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return null;

    return payload;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// getMobileUser
// ---------------------------------------------------------------------------

/**
 * Extracts Bearer token from the Authorization header, verifies it,
 * and looks up the user in the database.
 *
 * @returns The user record or null if auth fails
 */
export async function getMobileUser(
  req: NextRequest
): Promise<MobileUser | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const payload = await verifyMobileJwt(token);
  if (!payload || !payload.sub) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, name: true, role: true },
  });

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

// ---------------------------------------------------------------------------
// getSessionOrBearer
// ---------------------------------------------------------------------------

/**
 * Unified auth helper that supports both mobile Bearer tokens and
 * web cookie-based Auth.js sessions.
 *
 * Tries Bearer token first (via getMobileUser), then falls back to
 * the Auth.js cookie session.
 *
 * @returns `{ id, role }` or null if unauthenticated
 */
export async function getSessionOrBearer(
  req: NextRequest
): Promise<{ id: string; role: string } | null> {
  // 1. Try Bearer token (mobile)
  const mobileUser = await getMobileUser(req);
  if (mobileUser) {
    return { id: mobileUser.id, role: mobileUser.role };
  }

  // 2. Fall back to Auth.js cookie session (web)
  try {
    const { auth } = await import("./auth");
    const session = await auth();
    if (session?.user?.id && session?.user?.role) {
      return { id: session.user.id, role: session.user.role as string };
    }
  } catch {
    // Auth.js session check failed — treat as unauthenticated
    return null;
  }

  return null;
}
