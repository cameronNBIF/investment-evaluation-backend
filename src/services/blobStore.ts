// src/services/blobStore.ts
import { BlobServiceClient } from '@azure/storage-blob';
import { config } from '../config';

const blobService = BlobServiceClient.fromConnectionString(
  config.azureStorageConnectionString!
);

const container = blobService.getContainerClient(
  config.azureStorageContainer!
);

export async function putJSON(
  path: string,
  body: unknown
) {
  const stringified = JSON.stringify(body, null, 2);
  const blob = container.getBlockBlobClient(path);

  await blob.upload(stringified, Buffer.byteLength(stringified), {
    blobHTTPHeaders: {
      blobContentType: 'application/json'
    }
  });
}

// ---------- NEW: binary-upload helper ----------
export async function uploadBlob(
  path: string,
  data: Buffer,
  contentType = 'application/pdf'
): Promise<string> {
  const blobClient = container.getBlockBlobClient(path);

  // uploadData handles buffer length automatically
  await blobClient.uploadData(data, {
    blobHTTPHeaders: {
      blobContentType: contentType
    }
  });

  // Return the Blob URL (accessible depending on container permissions)
  return blobClient.url;
}
// ------------------------------------------------

async function streamToString(
  stream: NodeJS.ReadableStream
): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (d) => chunks.push(d));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    stream.on('error', reject);
  });
}

export async function readJSON<T>(path: string): Promise<T> {
  const blob = container.getBlobClient(path);
  const response = await blob.download();
  const body = await streamToString(response.readableStreamBody!);
  return JSON.parse(body);
}

export async function listRequestFolders(): Promise<string[]> {
  const prefixes: string[] = [];

  for await (const blob of container.listBlobsByHierarchy('/', {
    prefix: 'requests/'
  })) {
    if (blob.kind === 'prefix') {
      prefixes.push(blob.name);
    }
  }

  return prefixes;
}

export async function getBlobBuffer(path: string): Promise<Buffer> {
  const blob = container.getBlobClient(path);
  const download = await blob.download();
  
  const chunks: Buffer[] = [];
  for await (const chunk of download.readableStreamBody!) {
    chunks.push(chunk as Buffer);
  }

  return Buffer.concat(chunks);
}
