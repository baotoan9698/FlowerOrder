import "server-only";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

type Driver = "local" | "s3";
function localPath(key: string) {
  const root = resolve(".private-storage");
  const path = resolve(root, key);
  if (!path.startsWith(root + sep)) throw new Error("Invalid storage path");
  return path;
}
function storage() {
  const {
    S3_ENDPOINT,
    S3_REGION,
    S3_BUCKET,
    S3_ACCESS_KEY_ID,
    S3_SECRET_ACCESS_KEY,
  } = process.env;
  if (!S3_ENDPOINT || !S3_BUCKET || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY)
    throw new Error("S3 is not configured");
  if (!S3_ENDPOINT.startsWith("https://"))
    throw new Error("S3 endpoint must use HTTPS");
  return {
    bucket: S3_BUCKET,
    client: new S3Client({
      endpoint: S3_ENDPOINT,
      region: S3_REGION || "us-east-1",
      forcePathStyle: true,
      credentials: {
        accessKeyId: S3_ACCESS_KEY_ID,
        secretAccessKey: S3_SECRET_ACCESS_KEY,
      },
    }),
  };
}
function checkKey(shopId: string, key: string) {
  if (
    !/^shops\/[a-zA-Z0-9_-]+\/products\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9-]+\.webp$/.test(
      key,
    ) ||
    !key.startsWith(`shops/${shopId}/`)
  )
    throw new Error("Invalid image owner");
}
function checkLocal() {
  if (process.env.VERCEL || process.env.LOCAL_STORAGE_ENABLED !== "1")
    throw new Error("Local storage is disabled");
}
export async function putImage(
  shopId: string,
  key: string,
  bytes: Buffer,
): Promise<Driver> {
  checkKey(shopId, key);
  if (
    !process.env.S3_ENDPOINT &&
    !process.env.VERCEL &&
    process.env.LOCAL_STORAGE_ENABLED === "1"
  ) {
    const path = localPath(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, bytes, { flag: "wx" });
    return "local";
  }
  const { client, bucket } = storage();
  // The bucket must block public access. No public ACL or public image URL is emitted.
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: bytes,
      ContentType: "image/webp",
      CacheControl: "private, no-store",
      ACL: "private",
    }),
  );
  return "s3";
}
export async function readImage(shopId: string, key: string, driver: string) {
  checkKey(shopId, key);
  if (driver === "local") {
    checkLocal();
    return new Uint8Array(await readFile(localPath(key)));
  }
  if (driver !== "s3") throw new Error("Invalid storage driver");
  const { client, bucket } = storage();
  const result = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: key }),
  );
  if (!result.Body) throw new Error("Missing image");
  return result.Body.transformToByteArray();
}
export async function deleteStoredImage(
  shopId: string,
  key: string,
  driver: string,
) {
  checkKey(shopId, key);
  if (driver === "local") {
    checkLocal();
    await unlink(localPath(key)).catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
    return;
  }
  if (driver !== "s3") throw new Error("Invalid storage driver");
  const { client, bucket } = storage();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
