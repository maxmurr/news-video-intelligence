import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ChatBroadcastOption } from '@/lib/broadcast-types';
import { CirclePlusIcon, FilmIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

function broadcastTitle(broadcast: ChatBroadcastOption): string {
  const headline = broadcast.topHeadline?.trim();
  if (headline) return headline;
  return 'Untitled broadcast';
}

export function BroadcastPicker({
  broadcasts,
  selectedId,
  disabled,
  onSelectedIdChange,
}: {
  broadcasts: ChatBroadcastOption[];
  selectedId: string | null;
  disabled?: boolean;
  onSelectedIdChange: (id: string | null) => void;
}) {
  const hasSelection = selectedId !== null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        nativeButton
        disabled={disabled}
        render={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            title={
              hasSelection
                ? 'Change or clear the broadcast grounding this chat'
                : 'Optionally ground answers in a broadcast'
            }
            aria-label={hasSelection ? 'Change broadcast' : 'Add broadcast context'}
            className="text-muted-foreground hover:text-foreground h-8 gap-1.5 px-2"
          >
            <CirclePlusIcon className="size-3.5 shrink-0" aria-hidden />
            <span className="text-xs font-medium">{hasSelection ? 'Change' : 'Add broadcast'}</span>
          </Button>
        }
      />
      <DropdownMenuContent align="start" side="top" className="w-80">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Optional grounding</DropdownMenuLabel>
          {broadcasts.length === 0 ? (
            <p className="text-muted-foreground px-1.5 py-2 text-sm text-pretty">
              No broadcasts yet.{' '}
              <Link href="/" className="text-foreground underline-offset-4 hover:underline">
                Upload a broadcast
              </Link>{' '}
              to ground answers in footage.
            </p>
          ) : (
            broadcasts.map(broadcast => {
              const title = broadcastTitle(broadcast);
              return (
                <DropdownMenuCheckboxItem
                  key={broadcast.id}
                  checked={selectedId === broadcast.id}
                  onCheckedChange={checked => {
                    if (checked) onSelectedIdChange(broadcast.id);
                    else if (selectedId === broadcast.id) onSelectedIdChange(null);
                  }}
                  className="items-start gap-2 py-2"
                  title={title}
                >
                  <span className="bg-muted relative mt-0.5 size-8 shrink-0 overflow-hidden rounded-md">
                    {broadcast.thumbnailUrl ? (
                      <Image
                        src={broadcast.thumbnailUrl}
                        alt=""
                        fill
                        sizes="32px"
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <span className="text-muted-foreground flex size-full items-center justify-center">
                        <FilmIcon className="size-3.5" aria-hidden />
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-sm leading-snug">{title}</span>
                    {!broadcast.isAskReady ? (
                      <span className="text-muted-foreground mt-0.5 block text-xs">Transcribing…</span>
                    ) : null}
                  </span>
                </DropdownMenuCheckboxItem>
              );
            })
          )}
        </DropdownMenuGroup>
        {selectedId ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onSelectedIdChange(null)}>Ask without a broadcast</DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function BroadcastPickerFallback() {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled
      aria-label="Add broadcast context"
      className="text-muted-foreground h-8 gap-1.5 px-2"
    >
      <CirclePlusIcon className="size-3.5 shrink-0" aria-hidden />
      <span className="text-xs font-medium">Add broadcast</span>
    </Button>
  );
}
