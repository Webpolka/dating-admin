// app/(admin)/communications/chats/page.tsx
import { Suspense } from 'react';
import { ChatsPageClient } from './_components/chats-page-client';
import { Loader } from '@/components/ui/loader';

export default function PagesPage() {
  return (
    <Suspense fallback={<Loader className="min-h-[calc(100vh-60px)] w-full" />}>
      <ChatsPageClient />
    </Suspense>
  );
}
