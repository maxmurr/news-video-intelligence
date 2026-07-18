import type { Metadata } from 'next';
import { NotFoundScreen } from '@/components/not-found-screen';

export const metadata: Metadata = {
  title: 'Page not found · Broadcast Desk',
};

export default function NotFound() {
  return (
    <NotFoundScreen
      title="Page not found"
      description="Nothing at this URL. Return home to browse or upload a broadcast."
    />
  );
}
