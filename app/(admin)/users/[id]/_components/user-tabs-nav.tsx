"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  User,
  Shield,
  ShieldCheck,
  Flag,
  Ban,
  Image as ImageIcon,
  MessageSquare,
  BookOpen,
  Heart,
  Wallet,
  MessageCircle,
  Gift,
  Bell,
  History,
  CreditCard,
  Ticket,
  Rss,
  ShieldAlert,
} from "lucide-react";
import { useAdminUser } from "@/components/admin/admin-user-context";

interface UserTabsNavProps {
  userId: number;
}

type TabKey =
  | "profile"
  | "bans"
  | "sessions"
  | "reports"
  | "blocks"
  | "photos"
  | "photo-comments"
  | "diaries"
  | "diary-comments"
  | "dating"
  | "finances"
  | "chats"
  | "gifts"
  | "broadcasts"
  | "admin-logs"
  | "cards"
  | "promocodes"
  | "events"
  | "auth-logs";

interface TabDef {
  key: TabKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Array<"moderator" | "admin">;
}

const TABS: TabDef[] = [
  { key: "profile",          label: "Анкета",            icon: User,           roles: [] },
  { key: "bans",             label: "Статус и Баны",      icon: Shield,          roles: ["moderator", "admin"] },
  { key: "sessions",         label: "Сессии",             icon: ShieldCheck,    roles: ["admin"] },
  { key: "reports",          label: "Жалобы",             icon: Flag,           roles: ["moderator", "admin"] },
  { key: "blocks",           label: "Блокировки",         icon: Ban,            roles: ["moderator", "admin"] },
  { key: "photos",           label: "Фото",               icon: ImageIcon,      roles: ["moderator", "admin"] },
  { key: "photo-comments",   label: "Комм. фото",         icon: MessageSquare,  roles: ["moderator", "admin"] },
  { key: "diaries",          label: "Дневники",           icon: BookOpen,       roles: ["moderator", "admin"] },
  { key: "diary-comments",   label: "Комм. дневников",    icon: MessageSquare,  roles: ["moderator", "admin"] },
  { key: "dating",           label: "Знакомства",         icon: Heart,          roles: ["moderator", "admin"] },
  { key: "finances",         label: "Финансы",            icon: Wallet,         roles: ["admin"] },
  { key: "chats",            label: "Чаты",               icon: MessageCircle,  roles: ["moderator", "admin"] },
  { key: "gifts",            label: "Подарки",            icon: Gift,           roles: ["admin"] },
  { key: "broadcasts",       label: "Уведомления",        icon: Bell,           roles: ["admin"] },
  { key: "admin-logs",        label: "Логи админов",       icon: History,        roles: ["admin"] },
  { key: "cards",            label: "Карты",               icon: CreditCard,     roles: ["admin"] },
  { key: "promocodes",       label: "Промокоды",           icon: Ticket,         roles: ["admin"] },
  { key: "events",           label: "Лента событий",       icon: Rss,           roles: ["moderator", "admin"] },
  { key: "auth-logs",        label: "История входов",      icon: ShieldAlert,    roles: ["admin"] },
];

export function UserTabsNav({ userId }: UserTabsNavProps) {
  const pathname = usePathname();
  const admin = useAdminUser();

  // admin?.role может быть 'admin' | 'moderator' | 'support' | 'user'.
  // Поддержку имеют только admin/moderator. support видит только базовые табы (profile).
  const role = (admin?.role === "admin" || admin?.role === "moderator") ? admin.role : null;

  const visibleTabs = TABS.filter(
    (t) => t.roles.length === 0 || (role && t.roles.includes(role)),
  );

  const activeTab = useMemo(() => {
    const match = pathname.match(/\/users\/\d+\/([a-z-]+)/);
    return match?.[1] ?? "profile";
  }, [pathname]);

  return (
    <div className="border-b border-border">
      <nav className="flex gap-x-4 flex-wrap">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const href = `/users/${userId}/${tab.key}`;
          const isActive = activeTab === tab.key;

          return (
            <Link
              key={tab.key}
              href={href}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors inline-flex items-center gap-1.5 ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}