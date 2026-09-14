import { randomUUID } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { getStorageProvider } from "@/lib/env";
import { slugify } from "@/lib/utils";

let s3Client: S3Client | null = null;

type PresignedUpload = {
  key: string;
  uploadUrl: string;
  method: "PUT";
};

type StorageUploadInput = {
  key: string;
  body: Buffer;
  contentType: string;
};

function getS3Config() {
  const bucket = process.env.S3_BUCKET;
  const region = process.env.S3_REGION;
  const endpoint = process.env.S3_ENDPOINT;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

  if (!bucket || !region || !accessKeyId || !secretAccessKey) {
    throw new Error("S3-compatible storage is not fully configured.");
  }

  return { bucket, region, endpoint, accessKeyId, secretAccessKey };
}

function getS3Client() {
  if (!s3Client) {
    const { region, endpoint, accessKeyId, secretAccessKey } = getS3Config();
    s3Client = new S3Client({
      region,
      endpoint,
      forcePathStyle: Boolean(endpoint),
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  return s3Client;
}

export function buildObjectKey(prefix: string, fileName: string) {
  const extension = path.extname(fileName) || ".bin";
  const basename = slugify(path.basename(fileName, extension)) || "file";
  return `${prefix}/${basename}-${randomUUID()}${extension}`;
}

export async function createUploadTarget(
  fileName: string,
  contentType: string,
): Promise<PresignedUpload> {
  const key = buildObjectKey("uploads", fileName);

  if (getStorageProvider() === "mock") {
    return {
      key,
      uploadUrl: `/api/upload/mock/${key}`,
      method: "PUT",
    };
  }

  const { bucket } = getS3Config();
  const client = getS3Client();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  return {
    key,
    uploadUrl: await getSignedUrl(client, command, { expiresIn: 900 }),
    method: "PUT",
  };
}

export async function uploadBufferToStorage({ key, body, contentType }: StorageUploadInput) {
  if (getStorageProvider() === "mock") {
    return { key };
  }

  const { bucket } = getS3Config();
  const client = getS3Client();
  const upload = new Upload({
    client,
    params: {
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    },
  });

  await upload.done();
  return { key };
}

export async function deleteStorageObject(key: string) {
  if (getStorageProvider() === "mock") {
    return;
  }

  const { bucket } = getS3Config();
  const client = getS3Client();

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );
}

export async function getDownloadUrl(key: string) {
  if (getStorageProvider() === "mock") {
    return `/api/upload/mock/${key}`;
  }

  const { bucket } = getS3Config();
  const client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  return getSignedUrl(client, command, { expiresIn: 900 });
}

export async function downloadObjectToTempFile(key: string) {
  const tempDirectory = path.join(tmpdir(), "clippilot");
  await mkdir(tempDirectory, { recursive: true });
  const filePath = path.join(tempDirectory, `${randomUUID()}-${path.basename(key)}`);

  if (getStorageProvider() === "mock") {
    throw new Error("Mock storage cannot provide worker download input.");
  }

  const { bucket } = getS3Config();
  const client = getS3Client();
  const response = await client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );

  if (!response.Body) {
    throw new Error("Storage object body was empty.");
  }

  const { createWriteStream } = await import("node:fs");
  await pipeline(response.Body as NodeJS.ReadableStream, createWriteStream(filePath));

  return filePath;
}

export async function cleanupTempFile(filePath: string) {
  await rm(filePath, { force: true });
}
