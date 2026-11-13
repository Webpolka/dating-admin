"use client";

import Link from "next/link";
import { useUserDetail } from "@/hooks/admin/use-users";
import { UserDetailHeader } from "./user-detail-header";
import { UserTabsNav } from "./user-tabs-nav";
import { DeletedUserOverlay } from "./deleted-user-overlay";
import { Loader2 } from "lucide-react";

interface UserDetailClientProps {
  userId: number;
  children: React.ReactNode;
}

export function UserDetailClient({ userId, children }: UserDetailClientProps) {
  const { data: user, isLoading, isError } = useUserDetail(userId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-2">
        <p className="text-sm text-muted-foreground">Пользователь не найден</p>        
        <Link href="/users" className="text-sm text-primary hover:underline">
          ← Назад к списку        
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3 relative">
      <UserDetailHeader user={user} />

      <div className="relative">
        {user.deleted_at && <DeletedUserOverlay user={user} />}

        <UserTabsNav userId={user.id} />

        <div className="relative bg-card border border-border rounded-lg p-6 mt-4 min-h-100">
          {children}
        </div>
      </div>
    </div>
  );
}