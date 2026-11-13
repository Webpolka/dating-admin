// app/(admin)/dashboard/page.tsx
import { Suspense } from 'react';
import { DashboardPageClient } from './_components/dashboard-page-client';
import { Loader } from '@/components/ui/loader';

export default function DashboardPage() {
  return (
    <Suspense fallback={<Loader className="min-h-[calc(100vh-60px)] w-full" />}>
      <DashboardPageClient />
    </Suspense>
  );
}