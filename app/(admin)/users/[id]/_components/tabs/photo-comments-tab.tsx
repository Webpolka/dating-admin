"use client";

// app/(admin)/users/[id]/_components/tabs/photo-comments-tab.tsx
//
// Таб «Комм. фото»: комментарии, написанные пользователем.
//
// Per-user листинг: GET /admin/users/{userId}/photo-comments?status=&page=
// (UserListingsController::photoComments). Мутации (approve/reject/...)
// выполняются в глобальной очереди /moderation/photo-comments —
// туда ведёт ссылка на каждой карточке.

import { ExternalLink, Heart, MessageSquare, ShieldAlert } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { MiniPagination } from "@/components/admin/mini-pagination";
import { StatusTabs, type StatusTabDef } from "@/components/admin/status-tabs";
import { TabError, TabLoading } from "@/components/admin/tab-states";
import { UserBadge } from "@/components/admin/user-badge";
import { useTabUrl, parseEnumParam, parsePageParam } from "@/hooks/admin/use-tab-url";
import { useUserPhotoComments } from "@/hooks/admin/use-users";
import { formatDateTime } from "@/lib/format";
import type { UserCommentTabStatus } from "@/lib/api/users";
import type { UserBadgeData } from "@/lib/types";

interface PhotoCommentsTabProps {
  userId: number;
}

const STATUS_VALUES = ["all", "pending", "approved", "rejected", "spam", "karantine"] as const;

const STATUS_TABS: ReadonlyArray<StatusTabDef<UserCommentTabStatus>> = [
  { value: "all",       label: "Все",        icon: ShieldAlert,  iconColor: "text-muted-foreground" },
  { value: "pending",   label: "Ожидают",    icon: ShieldAlert,  iconColor: "text-yellow-500" },
  { value: "approved",  label: "Одобрены",   icon: ShieldAlert,  iconColor: "text-green-500" },
  { value: "rejected",  label: "Отклонены",  icon: ShieldAlert,  iconColor: "text-red-500" },
  { value: "spam",      label: "Спам",       icon: ShieldAlert,  iconColor: "text-orange-500" },
  { value: "karantine", label: "Карантин",   icon: ShieldAlert,  iconColor: "text-blue-500" },
];

/** Бейдж статуса комментария (карантин показывается вместо статуса). */
function CommentStatusBadge({ status, trashed }: { status: string; trashed: boolean }) {
  if (trashed) return <Badge variant="outline">Карантин</Badge>;
  switch (status) {
    case "approved":  return <Badge variant="success">Одобрен</Badge>;
    case "rejected":  return <Badge variant="destructive">Отклонён</Badge>;
    case "spam":      return <Badge variant="secondary">Спам</Badge>;
    default:          return <Badge variant="warning">Ожидает</Badge>;
  }
}

export function PhotoCommentsTab({ userId }: PhotoCommentsTabProps) {
  const basePath = `/users/${userId}/photo-comments`;
  const { searchParams, replace } = useTabUrl(basePath);

  const status = parseEnumParam(searchParams, "status", STATUS_VALUES, "all");
  const page = parsePageParam(searchParams);

  const { data, isLoading, isError, refetch } = useUserPhotoComments(userId, {
    status,
    page,
  });

  if (isLoading || !data) return <TabLoading label="Загрузка комментариев..." />;
  if (isError) return <TabError label="Не удалось загрузить комментарии" onRetry={refetch} />;

  const comments = data.data;
  const counts = data.counts;

  return (
    <div className="space-y-6">
      <StatusTabs
        tabs={STATUS_TABS}
        value={status}
        onChange={(next) =>
          replace((p) => {
            if (next !== "all") p.set("status", next);
            else p.delete("status");
            p.delete("page");
          })
        }
        getCount={(v) => (v === "all" ? counts.total : counts[v])}
      />

      {comments.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground py-12">
          Нет комментариев в этой категории.
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <div
              key={c.id}
              className="flex gap-4 p-4 border border-border rounded-lg bg-card hover:bg-muted/30 transition-colors"
            >
              {/* Превью фото, под которым оставлен комментарий */}
              {c.photo ? (
                <div className="shrink-0 relative">
                  {/* Медиа-домен бэкенда — next/image тут не применим. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={c.photo.thumb_url ?? ""}
                    alt=""
                    className="w-16 h-16 rounded-md object-cover border border-border"
                  />
                  {c.photo.is_primary && (
                    <span className="absolute bottom-1 right-1 text-[9px] bg-black/70 text-white px-1 rounded">
                      аватар
                    </span>
                  )}
                </div>
              ) : (
                <div className="w-16 h-16 rounded-md bg-muted flex items-center justify-center text-muted-foreground text-xs shrink-0">
                  нет фото
                </div>
              )}

              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm line-clamp-3 break-words">{c.content}</p>
                  <CommentStatusBadge status={c.status} trashed={c.trashed} />
                </div>

                <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {c.photo?.user && (
                    <span className="inline-flex items-center gap-1.5">
                      на фото:
                      <UserBadge user={c.photo.user as UserBadgeData} />
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5" /> {c.likes_count}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5" /> {c.replies_count}
                  </span>
                  {c.parent_id && <span>ответ в ветке #{c.parent_id}</span>}
                  <span>{formatDateTime(c.created_at)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <MiniPagination
        currentPage={data.current_page}
        lastPage={data.last_page}
        from={data.from}
        to={data.to}
        total={data.total}
        onChangePage={(next) => replace((p) => (next <= 1 ? p.delete("page") : p.set("page", String(next))))}
      />

      <div className="text-xs text-muted-foreground">
        <Link
          href="/moderation/photo-comments"
          className="inline-flex items-center gap-1 hover:text-foreground underline underline-offset-2"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Модерировать комментарии в общей очереди
        </Link>
      </div>
    </div>
  );
}
