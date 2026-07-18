'use client';

import { useRouter } from 'next/navigation';
import * as React from 'react';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';

/**
 * Destructive confirm + delete for one broadcast. Deletion is irreversible and
 * cascades every derived stage, so the action is always gated behind a dialog.
 * With `onDeletedAction` the caller drops the row itself (optimistic library
 * update); without it the button redirects home, since the page it lives on
 * is gone. Named `*Action` so Next's client-boundary check allows the
 * function prop on this `"use client"` entry.
 */
export function DeleteBroadcastButton({
  filename,
  title,
  onDeletedAction,
  className,
}: {
  filename: string;
  /** Headline (or fallback) shown in the confirm copy and toast. */
  title: string;
  onDeletedAction?: () => void;
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  const handleDelete = React.useCallback(async () => {
    setPending(true);
    try {
      const res = await fetch(`/api/videos?filename=${encodeURIComponent(filename)}`, { method: 'DELETE' });
      // A 404 means the row is already gone — a stale tab still resolves cleanly.
      if (!res.ok && res.status !== 404) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `Delete failed (${res.status}).`);
      }
      setOpen(false);
      toast.success('Broadcast deleted', { description: title });
      if (onDeletedAction) onDeletedAction();
      else router.push('/');
    } catch (error) {
      toast.error('Could not delete broadcast', {
        description: error instanceof Error ? error.message : 'Try again in a moment.',
      });
      setPending(false);
    }
  }, [filename, title, onDeletedAction, router]);

  return (
    <Dialog open={open} onOpenChange={next => !pending && setOpen(next)}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label={`Delete broadcast: ${title}`} className={className} />
        }
      >
        <Trash2 aria-hidden />
      </DialogTrigger>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Delete broadcast?</DialogTitle>
          <DialogDescription className="text-pretty">
            Removes “{title}”, its analysis, and every story. This can’t be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={pending} />}>Cancel</DialogClose>
          <Button variant="destructive" onClick={handleDelete} disabled={pending}>
            {pending ? <Spinner className="motion-reduce:animate-none" /> : <Trash2 aria-hidden />}
            {pending ? 'Deleting…' : 'Delete broadcast'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
