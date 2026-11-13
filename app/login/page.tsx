// app/login/page.tsx
import { Suspense } from 'react';
import { LoginPageClient } from './_components/login-page-client';
import { Loader } from '@/components/ui/loader';

export default function LoginPage() {
  return (
    <Suspense fallback={<Loader className="min-h-screen w-full" />}>
      <LoginPageClient />
    </Suspense>
  );
}