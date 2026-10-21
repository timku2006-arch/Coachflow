// Загрузка фото (multipart). Отдельный обработчик, а не server action: у server action лимит тела 1 МБ.
import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { getCurrentUser, toActor } from "@/server/auth";
import { uploadPhoto } from "@/server/services/photos";
import { AppError } from "@/server/errors";
import { MAX_UPLOAD_BYTES } from "@/server/images";

export async function POST(req: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== req.headers.get("host")) return NextResponse.json({ error: "Запрос с чужого сайта" }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Войдите в аккаунт" }, { status: 401 });
  const { clientId } = await params;
  if (Number(req.headers.get("content-length") ?? 0) > MAX_UPLOAD_BYTES + 1024 * 1024) {
    return NextResponse.json({ error: "Фото слишком большое (больше 15 МБ)" }, { status: 413 });
  }
  try {
    const form = await req.formData();
    const file = form.get("photo");
    if (!(file instanceof File)) return NextResponse.json({ error: "Выберите фото" }, { status: 400 });
    const photo = await uploadPhoto(toActor(user), clientId, Buffer.from(await file.arrayBuffer()), { takenOn: form.get("takenOn") });
    return NextResponse.json({ id: photo.id });
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
    if (e instanceof ZodError) return NextResponse.json({ error: e.issues[0]?.message ?? "Проверьте данные" }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "Не удалось загрузить фото" }, { status: 500 });
  }
}
