// «Приду» прямо из push-уведомления (кнопка на Android/компьютере).
// Вызывается service worker'ом с cookie сессии; сам ответ «Не смогу» обрабатывается на экране подтверждения.
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser, toActor } from "@/server/auth";
import { confirmAttendance } from "@/server/services/sessions";
import { AppError } from "@/server/errors";

const body = z.object({ sessionId: z.string().min(1).max(64) });

export async function POST(req: NextRequest) {
  // защита от запросов с чужих сайтов
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== req.headers.get("host")) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  try {
    await confirmAttendance(toActor(user), parsed.data.sessionId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.code === "NOT_FOUND" ? 404 : 409 });
    throw e;
  }
}
