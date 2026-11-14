"use client";

// app/(admin)/users/[id]/_components/tabs/dating-tab.tsx
//
// Таб «Знакомства»: свайпы и мэтчи пользователя.
//
// Per-user листинг: GET /admin/users/{userId}/dating?swipes_page=&matches_page=
// (UserListingsController::dating, две независимые пагинации — паттерн
// reports made/received). Мутации (разрыв мэтча и т.п.) — в глобальном
// разделе /moderation/dating?mode=swipes|matches&q=<id>.
//
// Зеркало blade-эталона: двухколоночный grid (слева свайпы, справа мэтчи),
// в каждой строке — #id (ссылка на модерацию), тип свайпа/статус мэтча
// с цветным бейджем, собеседник (UserBadge), относительная дата.

import { Heart, Star, ThumbsDown, Link2, Undo2, Users } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { MiniPagination } from "@/components/admin/mini-pagination";
import { TabError, TabLoading } from "@/components/admin/tab-states";
import { UserBadge } from "@/components/admin/user-badge";
import { useTabUrl, parsePageParam } from "@/hooks/admin/use-tab-url";
import { useUserDating } from "@/hooks/admin/use-users";
import { formatRelativeTime } from "@/lib/format";
import type { UserBadgeData } from "@/lib/types";
import type { MatchItem } from "@/hooks/admin/use-dating";
import type { UserSwipeItem } from "@/lib/api/users";

interface DatingTabProps {
  userId: number;
}

/** Метаданные типа свайпа — иконка + цвет (зеркало SwipeType enum на бэке). */
const SWIPE_META: Record<
  UserSwipeItem["type"],
  { label: string; icon: typeof Heart; className: string }
> = {
  like:      { label: "Лайк",      icon: Heart,      className: "bg-green-500/10 text-green-500" },
  superlike: { label: "Суперлайк", icon: Star,       className: "bg-yellow-500/10 text-yellow-500" },
  dislike:   { label: "Дизлайк",   icon: ThumbsDown, className: "bg-red-500/10 text-red-500" },
};

/** Метаданные статуса мэтча — цвет (зеркало MatchStatus enum на бэке). */
const MATCH_META: Record<MatchItem["status"], { label: string; className: string }> = {
  active:    { label: "Активен",  className: "bg-green-500/10 text-green-500" },
  unmatched: { label: "Разорван", className: "bg-red-500/10 text-red-500" },
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

  const { swipes, matches } = data;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* === ЛЕВАЯ КОЛОНКА: СВАЙПЫ === */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Heart className="w-4 h-4 text-blue-500" /> Свайпы ({swipes.total})
        </h3>

        {swipes.data.length === 0 ? (
          <div className="p-4 bg-muted/20 rounded-lg border border-border text-center text-xs text-muted-foreground">
            Пользователь еще никого не оценивал.
          </div>
        ) : (
          <div className="space-y-2">
            {swipes.data.map((s) => {
              const meta = SWIPE_META[s.type] ?? SWIPE_META.dislike;
              const Icon = meta.icon;
              return (
                <div
                  key={s.id}
                  className="flex items-center gap-3 p-3 border border-border rounded-lg bg-card hover:bg-muted/30 transition-colors"
                >
                  {/* #id → модерация, mode=swipes */}
                  <Link
                    href={`/moderation/dating?mode=swipes&q=${s.id}`}
                    className="text-xs font-mono text-blue-500 hover:underline shrink-0"
                    title="Найти в модерации"
                  >
                    #{s.id}
                  </Link>

                  {/* Тип свайпа — цветной бейдж */}
                  <span
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${meta.className}`}
                  >
                    <Icon className="w-3 h-3" />
                    {meta.label}
                  </span>

                  {/* Собеседник (кого оценил) */}
                  <div className="flex-1 min-w-0">
                    {s.targetUser ? (
                      <UserBadge user={s.targetUser as UserBadgeData} />
                    ) : (
                      <span className="text-sm text-muted-foreground italic">Удален</span>
                    )}
                  </div>

                  {/* Rewind-бейдж */}
                  {s.rewinded && (
                    <Badge variant="outline" className="gap-1 shrink-0">
                      <Undo2 className="w-3 h-3" />
                      откат
                    </Badge>
                  )}

                  <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                    {s.created_at ? formatRelativeTime(s.created_at) : "—"}
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
      </div>

      {/* === ПРАВАЯ КОЛОНКА: МЭТЧИ === */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Link2 className="w-4 h-4 text-destructive" /> Мэтчи ({matches.total})
        </h3>

        {matches.data.length === 0 ? (
          <div className="p-4 bg-muted/20 rounded-lg border border-border text-center text-xs text-muted-foreground">
            У пользователя нет мэтчей.
          </div>
        ) : (
          <div className="space-y-2">
            {matches.data.map((m) => {
              // Partner — тот из user1/user2, кто НЕ текущий юзер.
              const partner = m.user1?.id === userId ? m.user2 : m.user1;
              const meta = MATCH_META[m.status] ?? MATCH_META.active;
              return (
                <div
                  key={m.id}
                  className="flex items-center gap-3 p-3 border border-border rounded-lg bg-card hover:bg-muted/30 transition-colors"
                >
                  {/* #id → модерация, mode=matches */}
                  <Link
                    href={`/moderation/dating?mode=matches&q=${m.id}`}
                    className="text-xs font-mono text-blue-500 hover:underline shrink-0"
                    title="Найти в модерации"
                  >
                    #{m.id}
                  </Link>

                  {/* Собеседник */}
                  <div className="flex-1 min-w-0">
                    {partner ? (
                      <UserBadge user={partner as UserBadgeData} />
                    ) : (
                      <span className="text-sm text-muted-foreground italic">Удален</span>
                    )}
                  </div>

                  {/* Статус мэтча — цветной бейдж */}
                  <span
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${meta.className}`}
                  >
                    <Users className="w-3 h-3" />
                    {meta.label}
                  </span>

                  <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                    {m.created_at ? formatRelativeTime(m.created_at) : "—"}
                  </span>
                </div>
              );
            })}
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
      </div>
    </div>
  );
}
