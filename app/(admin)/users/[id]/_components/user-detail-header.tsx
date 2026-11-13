"use client";

import { ArrowLeft, Mail } from "lucide-react";
import { UserBadge } from "@/components/admin/user-badge";
import { HeaderActionsMenu } from "./header-actions-menu";
import type { UserDetail } from "@/lib/api/users";

interface UserDetailHeaderProps {
  user: UserDetail;
}

export function UserDetailHeader({ user }: UserDetailHeaderProps) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-4">
      <div className="flex items-center gap-4">
        <button
          onClick={() => history.back()}
          className="p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          title="Назад"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* UserBadge уже показывает аватар + статус + имя + премиум + верификацию */}
        <UserBadge user={user} size="md" showEmail={false} />
      </div>

      <div className="flex items-center gap-2">
        <a
          href={`mailto:${user.email}`}
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium border border-input bg-background hover:bg-accent h-9 px-4 py-2"
        >
          <Mail className="w-4 h-4" /> Email
        </a>

        <HeaderActionsMenu user={user} />
      </div>
    </div>
  );
}