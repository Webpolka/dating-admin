// app/(admin)/system/settings/page.tsx
import { Suspense } from 'react';
import { SettingsPageClient } from './_components/settings-page-client';
import { Loader } from '@/components/ui/loader';

export default function SettingsPage() {
  return (
    <Suspense fallback={<Loader className="min-h-[calc(100vh-60px)] w-full" />}>
      <SettingsPageClient />
    </Suspense>
  );
}