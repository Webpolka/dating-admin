// app/(admin)/system/logs/page.tsx
import { Suspense } from 'react';
import { LogsPageClient } from './_components/logs-page-client'; 
import { Loader } from '@/components/ui/loader';

export default function LogsPage() {
  return (
    <Suspense fallback={<Loader className="min-h-[calc(100vh-60px)] w-full" />}>
      <LogsPageClient />
    </Suspense>
  );
}