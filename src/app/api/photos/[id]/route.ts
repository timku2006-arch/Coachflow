// Отдача фото: только клиенту и его тренеру. Файлы не лежат в публичной папке.
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser, toActor } from "@/server/auth";
import { readPhoto } from "@/server/services/photos";
import { AppError } from "@/server/errors";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse(null, { status: 401 });
  const { id } = await params;
  const size = req.nextUrl.searchParams.get("size") === "thumb" ? "thumb" : "full";
  try {
    const data = await readPhoto(toActor(user), id, size);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": "image/webp",
        // фото не меняются (новое фото — новый id); кэш только в браузере пользователя
        "Cache-Control": "private, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") return new NextResponse(null, { status: 404 });
    throw e;
  }
}
