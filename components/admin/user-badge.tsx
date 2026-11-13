// components/admin/user-badge.tsx
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Crown, Gem, BadgeCheck, AlertCircle } from "lucide-react";
import { cn } from "cn";
import type { UserBadgeData } from "@/lib/types";

interface UserBadgeProps {
  user: UserBadgeData;
  size?: "sm" | "md";
  showEmail?: boolean;
  className?: string;
}

export function UserBadge({ user, size = "sm", showEmail = true, className }: UserBadgeProps) {
  const avatarSize = size === "sm" ? "w-8 h-8" : "w-10 h-10";
  const isBanned = user.status === "banned";
  const isShadowbanned = user.status === "shadowbanned";
  const isDeleted = user.deleted_at !== null;

  // Цвет восклицательного знака
  const alertColor = isBanned
    ? "text-red-500"
    : isShadowbanned
    ? "text-yellow-500"
    : isDeleted
    ? "text-blue-500"
    : null;

  return (
    <div className={cn("flex items-center gap-2 min-w-0 group cursor-pointer", className)}>
      {/* Аватар */}
      <div className="relative shrink-0">
        <Avatar className={avatarSize}>
          <AvatarImage src={user.avatar_url || undefined} />
          <AvatarFallback className="text-xs">{user.name.charAt(0)}</AvatarFallback>
        </Avatar>
        {/* Точка онлайн-статуса */}
        {user.is_online ? (
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background" title="Онлайн" />
        ) : (
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-muted-foreground/50 rounded-full border-2 border-background" title="Офлайн" />
        )}
      </div>

      {/* Имя + иконки + email */}
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-1">
          {/* Восклицательный знак */}
          {alertColor && (
            <AlertCircle className={cn("w-3.5 h-3.5 shrink-0", alertColor)}  />
          )}
          
          {/* ✅ Добавлен group-hover:text-primary */}
          <span className="text-sm font-medium truncate group-hover:text-primary transition-colors">
            {user.name}
          </span>

          {/* Premium (оранжевая корона) */}
          {user.has_active_premium && (
            <Crown className="w-3.5 h-3.5 text-orange-500 shrink-0" />
          )}
          
          {/* VIP (синий бриллиант) */}
          {user.has_active_vip && (
            <Gem className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          )}
          
          {/* Верификация (голубой кружок с галочкой) */}
          {user.is_verified && (
            <BadgeCheck className="w-4 h-4 text-sky-500 shrink-0" />
          )}
        </div>

        {/* Email */}
        {showEmail && (
          <span className="text-xs text-muted-foreground truncate group-hover:text-primary transition-colors">
            {user.email}
          </span>
        )}
      </div>
    </div>
  );
}