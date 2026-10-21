import { afterAll, beforeAll, describe, expect, it } from "vitest";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { S3Storage } from "@/server/storage";

// Минимальный «S3» в памяти: проверяем адреса, методы и подпись запросов.
const objects = new Map<string, Buffer>();
const seen: { method: string; url: string; auth: string | undefined; type: string | undefined }[] = [];
let server: http.Server;
let endpoint: string;

beforeAll(async () => {
  server = http.createServer((req, res) => {
    seen.push({ method: req.method!, url: req.url!, auth: req.headers.authorization, type: req.headers["content-type"] });
    if (!req.headers.authorization?.startsWith("AWS4-HMAC-SHA256 Credential=AK/")) return res.writeHead(403).end();
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      if (req.method === "PUT") objects.set(req.url!, Buffer.concat(chunks));
      if (req.method === "GET") {
        const o = objects.get(req.url!);
        return o ? res.writeHead(200).end(o) : res.writeHead(404).end();
      }
      if (req.method === "DELETE") objects.delete(req.url!);
      res.writeHead(200).end();
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  endpoint = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise<void>((r) => server.close(() => r())));

describe("S3-хранилище", () => {
  it("кладёт, читает и удаляет файл подписанными запросами в бакет", async () => {
    const s = new S3Storage(endpoint, "coachflow", "AK", "SECRET", "ru-1");
    await s.put("photos/c1/a.webp", Buffer.from("IMG"), "image/webp");
    expect((await s.get("photos/c1/a.webp"))?.toString()).toBe("IMG");
    await s.delete("photos/c1/a.webp");
    expect(await s.get("photos/c1/a.webp")).toBeNull();
    expect(seen[0]).toMatchObject({ method: "PUT", url: "/coachflow/photos/c1/a.webp", type: "image/webp" });
    expect(seen.every((x) => x.auth?.includes("/ru-1/s3/aws4_request"))).toBe(true);
  });
});
