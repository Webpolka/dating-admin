// app/(admin)/system/roles/page.tsx
import { Suspense } from 'react';
import { RolesPageClient } from './_components/roles-page-client';
import { Loader } from '@/components/ui/loader';

export default function RolesPage() {
  return (
    <Suspense fallback={<Loader className="min-h-[calc(100vh-60px)] w-full" />}>
      <RolesPageClient />
    </Suspense>
  );
}