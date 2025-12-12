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
  const blob = container.getBlockBlobClient(path);

  await blob.upload(
    JSON.stringify(body, null, 2),
    Buffer.byteLength(JSON.stringify(body)),
    {
      blobHTTPHeaders: {
        blobContentType: 'application/json'
      }
    }
  );
}

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
