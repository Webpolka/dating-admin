// app/(admin)/system/pages/page.tsx
import { Suspense } from 'react';
import { PagesTableClient } from './_components/pages-table-client';
import { Loader } from '@/components/ui/loader';

export default function PagesPage() {
  return (
    <Suspense fallback={<Loader className="min-h-[calc(100vh-60px)] w-full" />}>
      <PagesTableClient />
    </Suspense>
  );
}
