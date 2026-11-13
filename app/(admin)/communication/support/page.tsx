// app/(admin)/communications/support/page.tsx
import { Suspense } from 'react';
import { SupportChatsPageClient } from './_components/support-chats-page-client';
import { Loader } from '@/components/ui/loader';

export default function PagesPage() {
  return (
    <Suspense fallback={<Loader className="min-h-[calc(100vh-60px)] w-full" />}>
      <SupportChatsPageClient />
    </Suspense>
  );
}
