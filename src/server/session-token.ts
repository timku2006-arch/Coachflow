// Подпись/проверка сессионного cookie. Без зависимостей от Node — используется и в middleware.
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "cf_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 дней

export type Role = "TRAINER" | "CLIENT";
export type SessionPayload = { userId: string; role: Role };

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET не задан или короче 32 символов");
  return new TextEncoder().encode(s);
}

export async function signSession(p: SessionPayload): Promise<string> {
  return new SignJWT({ role: p.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(p.userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secret());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    const role = payload.role;
    if (typeof payload.sub !== "string" || (role !== "TRAINER" && role !== "CLIENT")) return null;
    return { userId: payload.sub, role };
  } catch {
    return null;
  }
}

export function homeFor(role: Role): string {
  return role === "TRAINER" ? "/trainer" : "/client";
}
