'use client';

import { useRouter } from 'next/navigation';
import * as React from 'react';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemMetadata,
  FileUploadItemPreview,
  FileUploadItemProgress,
  FileUploadList,
  FileUploadTrigger,
} from '@/components/ui/file-upload';
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_MB } from '@/lib/broadcast-types';

interface UploadResponse {
  filename?: string;
  /** Workflow run id; null when the upload landed but analysis failed to start. */
  runId?: string | null;
  error?: string;
}

/**
 * Raw body instead of multipart so the server streams straight to disk, and
 * XHR instead of fetch so the dropzone gets real upload progress events.
 */
function uploadVideo(file: File, onProgress: (percent: number) => void): Promise<UploadResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/videos');
    xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');
    xhr.upload.addEventListener('progress', event => {
      if (event.lengthComputable) onProgress((event.loaded / event.total) * 100);
    });
    xhr.addEventListener('load', () => {
      try {
        const body = JSON.parse(xhr.responseText) as UploadResponse;
        if (xhr.status >= 200 && xhr.status < 300) resolve(body);
        else reject(new Error(body.error ?? `Upload failed (${xhr.status})`));
      } catch {
        reject(new Error(`Upload failed (${xhr.status})`));
      }
    });
    xhr.addEventListener('error', () => reject(new Error('Network error during upload.')));
    xhr.send(file);
  });
}

export function UploadDropzone() {
  const router = useRouter();
  const [files, setFiles] = React.useState<File[]>([]);

  const onUpload = React.useCallback(
    async (
      accepted: File[],
      {
        onProgress,
        onSuccess,
        onError,
      }: {
        onProgress: (file: File, progress: number) => void;
        onSuccess: (file: File) => void;
        onError: (file: File, error: Error) => void;
      },
    ) => {
      const file = accepted[0];
      if (!file) return;
      try {
        const { filename, runId } = await uploadVideo(file, percent => onProgress(file, percent));
        if (!filename) throw new Error('Upload succeeded but no filename was returned.');
        onSuccess(file);
        if (runId === null) {
          toast.warning('Uploaded, but analysis didn’t start', {
            description: 'The broadcast is safe. Restart analysis from the next page.',
          });
        } else {
          toast.success('Broadcast uploaded', {
            description: 'Extracting transcript and stories. Progress opens next.',
          });
        }
        router.push(`/v/${filename}`);
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Upload failed.');
        onError(file, err);
        toast.error('Upload failed', { description: err.message });
      }
    },
    [router],
  );

  return (
    <FileUpload
      value={files}
      onValueChange={setFiles}
      onUpload={onUpload}
      onFileReject={(_, message) => toast.error('File rejected', { description: message })}
      accept="video/mp4"
      maxFiles={1}
      maxSize={MAX_UPLOAD_BYTES}
      label="Upload a news broadcast"
    >
      <FileUploadDropzone className="border-border hover:bg-muted/30 data-dragging:bg-muted/40 flex h-10 flex-row items-center justify-between gap-3 rounded-lg border border-solid px-3 py-0 transition-colors duration-150 ease-out outline-none">
        <p className="text-muted-foreground min-w-0 flex-1 text-left text-xs text-pretty">
          MP4 · up to {MAX_UPLOAD_MB} MB
        </p>
        <FileUploadTrigger
          render={
            <Button variant="default" size="default" className="shrink-0">
              Upload broadcast
            </Button>
          }
        />
      </FileUploadDropzone>
      <FileUploadList>
        {files.map(file => (
          <FileUploadItem key={file.name} value={file}>
            <FileUploadItemPreview />
            <FileUploadItemMetadata />
            <FileUploadItemProgress />
            <FileUploadItemDelete
              render={
                <Button variant="ghost" size="icon-sm" aria-label="Remove file">
                  <X aria-hidden />
                </Button>
              }
            />
          </FileUploadItem>
        ))}
      </FileUploadList>
    </FileUpload>
  );
}
