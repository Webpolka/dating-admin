// app/(admin)/security/block-signals/page.tsx
import { Suspense } from 'react';
import { BlockSignalsTableClient } from './_components/block-signals-table-client';
import { Loader } from '@/components/ui/loader';

export default function PagesPage() {
  return (
    <Suspense fallback={<Loader className="min-h-[calc(100vh-60px)] w-full" />}>
      <BlockSignalsTableClient />
    </Suspense>
  );
}
