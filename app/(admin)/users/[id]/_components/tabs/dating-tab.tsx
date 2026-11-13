"use client";

// app/(admin)/users/[id]/_components/tabs/dating-tab.tsx
//
// Таб «Знакомства»: свайпы и мэтчи пользователя.
//
// Per-user листинг: GET /admin/users/{userId}/dating?swipes_page=&matches_page=
// (UserListingsController::dating, две независимые пагинации — паттерн
// reports made/received). Мутации (разрыв мэтча и т.п.) — в глобальном
// разделе /moderation/dating.

import { Heart, HeartCrack, ThumbsDown, Zap, Users, Undo2 } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { MiniPagination } from "@/components/admin/mini-pagination";
import { TabError, TabLoading } from "@/components/admin/tab-states";
import { UserBadge } from "@/components/admin/user-badge";
import { useTabUrl, parsePageParam } from "@/hooks/admin/use-tab-url";
import { useUserDating } from "@/hooks/admin/use-users";
import { formatDateTime } from "@/lib/format";
import type { UserBadgeData } from "@/lib/types";

interface DatingTabProps {
  userId: number;
}

const SWIPE_META = {
  like:      { label: "Лайк",       icon: Heart,        className: "text-red-500", badge: "destructive" as const },
  superlike: { label: "Супер-лайк", icon: Zap,          className: "text-blue-500", badge: "default" as const },
  dislike:   { label: "Дизлайк",    icon: ThumbsDown,   className: "text-muted-foreground", badge: "secondary" as const },
};

export function DatingTab({ userId }: DatingTabProps) {
  const basePath = `/users/${userId}/dating`;
  const { searchParams, replace } = useTabUrl(basePath);

  const swipesPage = parsePageParam(searchParams, "swipes_page");
  const matchesPage = parsePageParam(searchParams, "matches_page");

  const { data, isLoading, isError, refetch } = useUserDating(userId, {
    swipes_page: swipesPage,
    matches_page: matchesPage,
  });

  if (isLoading || !data) return <TabLoading label="Загрузка знакомств..." />;
  if (isError) return <TabError label="Не удалось загрузить знакомства" onRetry={refetch} />;

  const { swipes, matches, counts } = data;

  return (
    <div className="space-y-8">
      {/* === Сводка === */}
      <div className="flex flex-wrap gap-2 text-xs">
        <Badge variant="secondary">Свайпов: {counts.swipes}</Badge>
        <Badge variant="secondary">Лайков: {counts.likes}</Badge>
        <Badge variant="secondary">Супер-лайков: {counts.superlikes}</Badge>
        <Badge variant="secondary">Дизлайков: {counts.dislikes}</Badge>
        <Badge>Мэтчей: {counts.matches}</Badge>
      </div>

      {/* === Свайпы === */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Heart className="w-4 h-4 text-red-500" />
          Свайпы пользователя
        </h3>

        {swipes.data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Пользователь ещё никого не свайпал.</p>
        ) : (
          <div className="space-y-2">
            {swipes.data.map((s) => {
              const meta = SWIPE_META[s.type] ?? SWIPE_META.dislike;
              const Icon = meta.icon;
              return (
                <div
                  key={s.id}
                  className="flex items-center gap-4 p-3 border border-border rounded-lg bg-card"
                >
                  <Icon className={`w-5 h-5 shrink-0 ${meta.className}`} aria-label={meta.label} />
                  <div className="flex-1 min-w-0">
                    {s.targetUser ? (
                      <UserBadge user={s.targetUser as UserBadgeData} />
                    ) : (
                      <span className="text-sm text-muted-foreground">Юзер удалён</span>
                    )}
                  </div>
                  {s.rewinded && (
                    <Badge variant="outline" className="gap-1">
                      <Undo2 className="w-3 h-3" />
                      откачено
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDateTime(s.created_at)}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <MiniPagination
          currentPage={swipes.current_page}
          lastPage={swipes.last_page}
          from={swipes.from}
          to={swipes.to}
          total={swipes.total}
          onChangePage={(next) =>
            replace((p) => (next <= 1 ? p.delete("swipes_page") : p.set("swipes_page", String(next))))
          }
        />
      </section>

      {/* === Мэтчи === */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Users className="w-4 h-4" />
          Мэтчи
        </h3>

        {matches.data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Мэтчей нет.</p>
        ) : (
          <div className="space-y-2">
            {matches.data.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-4 p-3 border border-border rounded-lg bg-card flex-wrap"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
                  {m.user1 ? (
                    <UserBadge user={m.user1 as UserBadgeData} />
                  ) : (
                    <span className="text-sm text-muted-foreground">Юзер удалён</span>
                  )}
                  <HeartCrack className="w-4 h-4 text-muted-foreground shrink-0" />
                  {m.user2 ? (
                    <UserBadge user={m.user2 as UserBadgeData} />
                  ) : (
                    <span className="text-sm text-muted-foreground">Юзер удалён</span>
                  )}
                </div>

                {m.status === "unmatched" ? (
                  <Badge variant="outline">разорван {formatDateTime(m.unmatched_at)}</Badge>
                ) : (
                  <Badge variant="success">активен</Badge>
                )}
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDateTime(m.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}

        <MiniPagination
          currentPage={matches.current_page}
          lastPage={matches.last_page}
          from={matches.from}
          to={matches.to}
          total={matches.total}
          onChangePage={(next) =>
            replace((p) => (next <= 1 ? p.delete("matches_page") : p.set("matches_page", String(next))))
          }
        />
      </section>

      <div className="text-xs text-muted-foreground">
        <Link
          href="/moderation/dating"
          className="hover:text-foreground underline underline-offset-2"
        >
          Управлять свайпами и мэтчами в разделе «Знакомства»
        </Link>
      </div>
    </div>
  );
}
