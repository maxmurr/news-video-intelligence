import type { ReactNode } from 'react';
import { BroadcastUploadDropzone } from './broadcast-upload-dropzone';

export function BroadcastUpload({ children }: { children?: ReactNode }) {
  return (
    <section aria-labelledby="upload-heading" className="flex flex-col gap-2">
      {children ?? (
        <h2 id="upload-heading" className="sr-only">
          New broadcast
        </h2>
      )}
      <BroadcastUploadDropzone />
    </section>
  );
}
