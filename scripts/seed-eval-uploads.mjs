/**
 * Copies every MP4 under public/uploads into the object bucket under the same
 * key. Eval suites discover fixtures from the local directory, but the pipeline
 * reads videos from storage — both sides must agree on the filename.
 *
 *   pnpm eval:seed
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const bucket = process.env.S3_BUCKET;
if (!bucket) {
  console.error('S3_BUCKET is not set. Run with: node --env-file=.env scripts/seed-eval-uploads.mjs');
  process.exit(1);
}

const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
const files = (await readdir(uploadsDir)).filter(f => f.endsWith('.mp4'));

if (files.length === 0) {
  console.error(`No .mp4 fixtures in ${uploadsDir}. Drop at least one file there, then re-run.`);
  process.exit(1);
}

const client = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION ?? 'us-east-1',
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY ?? 'placeholder',
    secretAccessKey: process.env.S3_SECRET_KEY ?? 'placeholder',
  },
});

for (const filename of files) {
  const key = filename;
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    console.log(`Already in bucket: ${key}`);
    continue;
  } catch {
    // missing — upload below
  }

  const body = await readFile(path.join(uploadsDir, filename));
  const { size } = await stat(path.join(uploadsDir, filename));
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: 'video/mp4',
      ContentLength: size,
    }),
  );
  console.log(`Uploaded ${key} (${size} bytes).`);
}
