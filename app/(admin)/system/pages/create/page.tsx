// app/(admin)/system/pages/create/page.tsx
import { Suspense } from 'react';
import { PageFormClient } from '../_components/page-form-client';
import { Loader } from '@/components/ui/loader';

export default function CreatePagePage() {
  return (
    <Suspense fallback={<Loader className="min-h-[calc(100vh-60px)] w-full" />}>
      <PageFormClient mode="create" />
    </Suspense>
  );
}