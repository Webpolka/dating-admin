// app/(admin)/system/pages/[id]/edit/page.tsx
import { Suspense } from 'react';
import { PageFormClient } from '../../_components/page-form-client';
import { Loader } from '@/components/ui/loader';

export default async function EditPagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  return (
    <Suspense fallback={<Loader className="min-h-[calc(100vh-60px)] w-full" />}>
      <PageFormClient mode="edit" pageId={parseInt(id, 10)} />
    </Suspense>
  );
}