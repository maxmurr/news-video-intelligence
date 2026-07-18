'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '/', id: 'library', label: 'Library', match: (pathname: string) => pathname === '/' },
  { href: '/chat', id: 'chat', label: 'Ask', match: (pathname: string) => pathname.startsWith('/chat') },
] as const;

export function DeskNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Desk" className="flex h-8 items-center justify-between gap-4">
      <Link
        href="/"
        className="text-muted-foreground hover:text-foreground inline-flex h-8 items-center text-xs font-medium transition-colors duration-150 ease-out"
      >
        Broadcast Desk
      </Link>
      <ul className="flex h-8 items-center gap-1">
        {LINKS.map(link => {
          const isActive = link.match(pathname);
          return (
            <li key={link.id}>
              <Link
                href={link.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'inline-flex h-8 items-center rounded-md px-2.5 text-xs font-medium transition-colors duration-150 ease-out',
                  isActive
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                )}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
