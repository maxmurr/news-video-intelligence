/**
 * Storage client for uploaded broadcast videos, backed by files-sdk. The fs
 * adapter is rooted at public/uploads so Next.js keeps serving the files
 * statically at /uploads/<key>; swapping to a cloud adapter later only
 * changes this module.
 */
import 'server-only';
import { createFiles, FilesError } from 'files-sdk';
import { fs } from 'files-sdk/fs';
import { UPLOADS_DIR } from './artifacts';

export const uploads = createFiles({
  adapter: fs({ root: UPLOADS_DIR, urlBaseUrl: '/uploads' }),
});

/**
 * The adapter wraps every failure in a FilesError, including errors our own
 * guarded request stream raised mid-upload. Surfaces the original error so
 * routes can map validation failures to status codes.
 */
export function unwrapFilesError(error: unknown): unknown {
  return error instanceof FilesError && error.cause !== undefined ? error.cause : error;
}
