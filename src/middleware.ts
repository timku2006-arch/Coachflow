import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, homeFor, verifySession } from "@/server/session-token";

/**
 * Первая линия защиты: разводит роли по разделам /trainer и /client.
 * Полная проверка (пользователь существует, права на конкретные данные) — на сервере в каждой странице и действии.
 */
export async function middleware(req: NextRequest) {
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  const { pathname } = req.nextUrl;
  const area = pathname.startsWith("/trainer") ? "TRAINER" : pathname.startsWith("/client") ? "CLIENT" : null;
  if (!area) return NextResponse.next();
  if (!session) {
    const url = new URL("/login", req.url);
    return NextResponse.redirect(url);
  }
  if (session.role !== area) return NextResponse.redirect(new URL(homeFor(session.role), req.url));
  return NextResponse.next();
}

export const config = { matcher: ["/trainer/:path*", "/client/:path*"] };
