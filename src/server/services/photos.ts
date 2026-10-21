import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "../db";
import type { Actor } from "../actor";
import { assertClientAccess } from "../access";
import { notFound } from "../errors";
import { getStorage } from "../storage";
import { processPhoto } from "../images";
import { dateString } from "@/lib/validation";
import { dateOnly, dateOnlyToString } from "@/lib/time";

const uploadSchema = z.object({ takenOn: dateString });

/** Загрузка фото клиентом или его тренером: сжатие → хранилище → запись в БД. */
export async function uploadPhoto(actor: Actor, clientId: string, file: Buffer, input: unknown) {
  await assertClientAccess(prisma, actor, clientId);
  const { takenOn } = uploadSchema.parse(input);
  const img = await processPhoto(file);
  const id = randomUUID();
  const storageKey = `photos/${clientId}/${id}.webp`;
  const thumbKey = `photos/${clientId}/${id}-thumb.webp`;
  const storage = getStorage();
  await storage.put(storageKey, img.full, "image/webp");
  await storage.put(thumbKey, img.thumb, "image/webp");
  try {
    return await prisma.progressPhoto.create({
      data: { clientId, takenOn: dateOnly(takenOn), storageKey, thumbKey, width: img.width, height: img.height, sizeBytes: img.full.byteLength, uploadedById: actor.userId },
    });
  } catch (e) {
    await Promise.allSettled([storage.delete(storageKey), storage.delete(thumbKey)]);
    throw e;
  }
}

export async function listPhotos(actor: Actor, clientId: string) {
  await assertClientAccess(prisma, actor, clientId);
  const rows = await prisma.progressPhoto.findMany({ where: { clientId }, orderBy: [{ takenOn: "desc" }, { createdAt: "desc" }] });
  return rows.map((p) => ({ id: p.id, takenOn: dateOnlyToString(p.takenOn), width: p.width, height: p.height }));
}

/** Файл фото — только клиенту и его тренеру. Чужим — «не найдено». */
export async function readPhoto(actor: Actor, photoId: string, size: "full" | "thumb") {
  const p = await prisma.progressPhoto.findUnique({ where: { id: photoId } });
  if (!p) throw notFound("Фото");
  await assertClientAccess(prisma, actor, p.clientId);
  const data = await getStorage().get(size === "thumb" ? p.thumbKey : p.storageKey);
  if (!data) throw notFound("Файл фото");
  return data;
}

export async function deletePhoto(actor: Actor, photoId: string) {
  const p = await prisma.progressPhoto.findUnique({ where: { id: photoId } });
  if (!p) throw notFound("Фото");
  await assertClientAccess(prisma, actor, p.clientId);
  await prisma.progressPhoto.delete({ where: { id: p.id } });
  const storage = getStorage();
  await Promise.allSettled([storage.delete(p.storageKey), storage.delete(p.thumbKey)]);
  return p.clientId;
}
