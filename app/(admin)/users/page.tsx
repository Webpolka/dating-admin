// app/(admin)/users/page.tsx
import { Suspense } from "react";
import { UsersPageClient } from "./_components/users-page-client";
import { Loader } from "@/components/ui/loader";

export default function UsersPage() {
  return (
    <Suspense fallback={<Loader className="min-h-[calc(100vh-60px)] w-full" />}>
      <UsersPageClient />
    </Suspense>
  );
}