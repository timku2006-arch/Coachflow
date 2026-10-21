// Хранилище файлов вне БД.
// По умолчанию — папка на диске (UPLOADS_DIR, по умолчанию ./data/uploads).
// Если заданы S3_* — S3-совместимое хранилище (Timeweb S3, Yandex Object Storage, Selectel и т.п.).
import { promises as fs } from "node:fs";
import path from "node:path";
import { AwsClient } from "aws4fetch";

export interface FileStorage {
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
}

const SAFE_KEY = /^[a-z0-9][a-z0-9/_.-]{0,200}$/i;
function checkKey(key: string) {
  if (!SAFE_KEY.test(key) || key.includes("..")) throw new Error(`Недопустимый ключ файла: ${key}`);
}

export class LocalStorage implements FileStorage {
  constructor(private readonly root: string) {}
  private file(key: string) {
    checkKey(key);
    const full = path.resolve(this.root, key);
    if (!full.startsWith(path.resolve(this.root) + path.sep)) throw new Error("Путь вне хранилища");
    return full;
  }
  async put(key: string, data: Buffer, _contentType?: string) {
    const f = this.file(key);
    await fs.mkdir(path.dirname(f), { recursive: true });
    await fs.writeFile(f, data, { mode: 0o600 });
  }
  async get(key: string) {
    try {
      return await fs.readFile(this.file(key));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw e;
    }
  }
  async delete(key: string) {
    await fs.rm(this.file(key), { force: true });
  }
}

export class S3Storage implements FileStorage {
  private client: AwsClient;
  constructor(
    private readonly endpoint: string,
    private readonly bucket: string,
    accessKeyId: string,
    secretAccessKey: string,
    region: string,
  ) {
    this.client = new AwsClient({ accessKeyId, secretAccessKey, region, service: "s3" });
  }
  private url(key: string) {
    checkKey(key);
    return `${this.endpoint.replace(/\/$/, "")}/${this.bucket}/${key}`;
  }
  async put(key: string, data: Buffer, contentType: string) {
    const r = await this.client.fetch(this.url(key), { method: "PUT", body: new Uint8Array(data), headers: { "Content-Type": contentType } });
    if (!r.ok) throw new Error(`S3 PUT ${r.status}: ${await r.text()}`);
  }
  async get(key: string) {
    const r = await this.client.fetch(this.url(key));
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`S3 GET ${r.status}`);
    return Buffer.from(await r.arrayBuffer());
  }
  async delete(key: string) {
    const r = await this.client.fetch(this.url(key), { method: "DELETE" });
    if (!r.ok && r.status !== 404) throw new Error(`S3 DELETE ${r.status}`);
  }
}

let storage: FileStorage | null = null;

export function getStorage(): FileStorage {
  if (storage) return storage;
  const e = process.env;
  if (e.S3_BUCKET && e.S3_ENDPOINT && e.S3_ACCESS_KEY && e.S3_SECRET_KEY) {
    storage = new S3Storage(e.S3_ENDPOINT, e.S3_BUCKET, e.S3_ACCESS_KEY, e.S3_SECRET_KEY, e.S3_REGION || "ru-1");
  } else {
    storage = new LocalStorage(e.UPLOADS_DIR || path.join(process.cwd(), "data", "uploads"));
  }
  return storage;
}

/** Для тестов. */
export function setStorage(s: FileStorage | null) {
  storage = s;
}
