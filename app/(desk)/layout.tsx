import { DeskNav } from '@/components/desk-nav';

export default function DeskLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6">
        <DeskNav />
        {children}
      </div>
    </main>
  );
}
