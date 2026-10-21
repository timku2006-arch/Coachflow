import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { prisma } from "@/server/db";
import { LocalStorage, setStorage } from "@/server/storage";
import { deletePhoto, listPhotos, readPhoto, uploadPhoto } from "@/server/services/photos";
import { AppError } from "@/server/errors";
import { makeClient, makeTrainer, resetDb } from "./helpers";
import type { ClientActor, TrainerActor } from "@/server/actor";

let dir: string;
let trainer: TrainerActor;
let client: ClientActor;
let bigJpeg: Buffer;
const code = (c: AppError["code"]) => (e: unknown) => e instanceof AppError && e.code === c;

beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "cf-photos-"));
  setStorage(new LocalStorage(dir));
  // «фото с телефона»: 4000×3000, с EXIF и координатами
  bigJpeg = await sharp({ create: { width: 4000, height: 3000, channels: 3, background: { r: 200, g: 120, b: 90 } } })
    .jpeg({ quality: 95 })
    .withExif({ IFD0: { Make: "Phone", Model: "X" }, IFD3: { GPSLatitudeRef: "N", GPSLatitude: "55/1 45/1 0/1" } })
    .toBuffer();
});
afterAll(async () => {
  setStorage(null);
  await rm(dir, { recursive: true, force: true });
  await prisma.$disconnect();
});
beforeEach(async () => {
  await resetDb();
  trainer = await makeTrainer();
  client = await makeClient(trainer);
});

const files = async () => (await readdir(path.join(dir, "photos"), { recursive: true })).filter((f) => f.endsWith(".webp"));

describe("фото до/после", () => {
  it("сжимается до 1600 px в WebP, без EXIF/GPS, хранится вне БД", async () => {
    const p = await uploadPhoto(client, client.clientId, bigJpeg, { takenOn: "2026-10-01" });
    expect([p.width, p.height]).toEqual([1600, 1200]);
    expect(p.sizeBytes).toBeLessThan(bigJpeg.byteLength);
    const full = await readPhoto(client, p.id, "full");
    const meta = await sharp(full).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.exif).toBeUndefined();
    const thumb = await sharp(await readPhoto(client, p.id, "thumb")).metadata();
    expect(Math.max(thumb.width!, thumb.height!)).toBe(480);
    expect((await files()).filter((f) => f.includes(p.storageKey.split("/").pop()!.replace(".webp", "")))).toHaveLength(2);
  });
  it("лента по датам (новые сверху); тренер видит фото клиента, другие — нет", async () => {
    await uploadPhoto(trainer, client.clientId, bigJpeg, { takenOn: "2026-09-01" });
    const later = await uploadPhoto(client, client.clientId, bigJpeg, { takenOn: "2026-10-15" });
    expect((await listPhotos(trainer, client.clientId)).map((x) => x.takenOn)).toEqual(["2026-10-15", "2026-09-01"]);
    const other = await makeClient(trainer);
    const stranger = await makeTrainer();
    await expect(readPhoto(other, later.id, "full")).rejects.toSatisfy(code("NOT_FOUND"));
    await expect(readPhoto(stranger, later.id, "thumb")).rejects.toSatisfy(code("NOT_FOUND"));
    await expect(listPhotos(other, client.clientId)).rejects.toSatisfy(code("NOT_FOUND"));
    await expect(uploadPhoto(stranger, client.clientId, bigJpeg, { takenOn: "2026-10-15" })).rejects.toSatisfy(code("NOT_FOUND"));
  });
  it("удаление убирает запись и файлы", async () => {
    const before = (await files()).length;
    const p = await uploadPhoto(client, client.clientId, bigJpeg, { takenOn: "2026-10-01" });
    expect((await files()).length).toBe(before + 2);
    await deletePhoto(trainer, p.id);
    expect(await prisma.progressPhoto.count()).toBe(0);
    expect((await files()).length).toBe(before);
  });
  it("не изображение и пустой файл отклоняются", async () => {
    await expect(uploadPhoto(client, client.clientId, Buffer.from("not an image"), { takenOn: "2026-10-01" })).rejects.toThrow(/Не удалось прочитать/);
    await expect(uploadPhoto(client, client.clientId, Buffer.alloc(0), { takenOn: "2026-10-01" })).rejects.toThrow(/пустой/);
    await expect(uploadPhoto(client, client.clientId, bigJpeg, { takenOn: "вчера" })).rejects.toThrow();
  });
  it("ключи хранилища защищены от выхода за папку", async () => {
    const s = new LocalStorage(dir);
    await expect(s.put("../evil.txt", Buffer.from("x"), "text/plain")).rejects.toThrow(/Недопустимый/);
  });
});
