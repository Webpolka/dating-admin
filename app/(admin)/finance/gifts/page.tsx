// app/(admin)/monetization/gifts/page.tsx
import { Suspense } from 'react';
import { GiftsPageClient } from "./_components/gifts-page-client";
import { Loader } from '@/components/ui/loader';

export default function GiftsPage() {
  return (
    <Suspense fallback={<Loader className="min-h-[calc(100vh-60px)] w-full" />}>
      <GiftsPageClient />
    </Suspense>
  );
}
