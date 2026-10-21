import sharp, { type Metadata } from "sharp";
import { AppError } from "./errors";

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const FULL_PX = 1600;
const THUMB_PX = 480;

/**
 * Готовит фото к хранению: поворачивает по EXIF, уменьшает до 1600 px по длинной стороне,
 * сохраняет в WebP и делает превью 480 px. Метаданные (в т.ч. GPS) удаляются.
 */
export async function processPhoto(input: Buffer) {
  if (input.byteLength === 0) throw new AppError("VALIDATION", "Файл пустой");
  if (input.byteLength > MAX_UPLOAD_BYTES) throw new AppError("VALIDATION", "Фото слишком большое (больше 15 МБ)");
  let meta: Metadata;
  try {
    meta = await sharp(input, { limitInputPixels: 80_000_000 }).metadata();
  } catch {
    throw new AppError("VALIDATION", "Не удалось прочитать изображение. Подойдут JPG, PNG или WebP.");
  }
  if (!meta.width || !meta.height) throw new AppError("VALIDATION", "Это не похоже на фото");

  const base = () => sharp(input, { limitInputPixels: 80_000_000 }).rotate();
  const full = await base().resize({ width: FULL_PX, height: FULL_PX, fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer({ resolveWithObject: true });
  const thumb = await base().resize({ width: THUMB_PX, height: THUMB_PX, fit: "inside", withoutEnlargement: true }).webp({ quality: 72 }).toBuffer();
  return { full: full.data, thumb, width: full.info.width, height: full.info.height };
}
