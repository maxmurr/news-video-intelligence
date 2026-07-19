/**
 * Creates the S3 bucket the app uploads to. Idempotent — safe to re-run.
 *
 * A fresh rustfs container ships with no buckets, and rustfs accepts
 * CreateMultipartUpload against a missing bucket only to 404 the part uploads
 * with a misleading NoSuchUpload. Run this once after `docker compose up`:
 *
 *   pnpm storage:bootstrap
 */
import { CreateBucketCommand, HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';

const bucket = process.env.S3_BUCKET;
if (!bucket) {
  console.error('S3_BUCKET is not set. Run with: node scripts/bootstrap-storage.mjs');
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

try {
  await client.send(new HeadBucketCommand({ Bucket: bucket }));
  console.log(`Bucket "${bucket}" already exists.`);
} catch {
  await client.send(new CreateBucketCommand({ Bucket: bucket }));
  console.log(`Created bucket "${bucket}".`);
}
