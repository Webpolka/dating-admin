"use client";

// app/(admin)/users/[id]/_components/tabs/diary-comments-tab.tsx
//
// Таб «Комм. дневников»: комментарии к дневникам, написанные пользователем.
//
// Per-user листинг: GET /admin/users/{userId}/diary-comments?status=&page=
// (UserListingsController::diaryComments). Мутации — в глобальной очереди
// /moderation/diary-comments.

import { ExternalLink, Heart, MessageSquare } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { MiniPagination } from "@/components/admin/mini-pagination";
import { StatusTabs, type StatusTabDef } from "@/components/admin/status-tabs";
import { TabError, TabLoading } from "@/components/admin/tab-states";
import { useTabUrl, parseEnumParam, parsePageParam } from "@/hooks/admin/use-tab-url";
import { useUserDiaryComments } from "@/hooks/admin/use-users";
import { formatDateTime } from "@/lib/format";
import type { UserCommentTabStatus } from "@/lib/api/users";

interface DiaryCommentsTabProps {
  userId: number;
}

const STATUS_VALUES = ["all", "pending", "approved", "rejected", "spam", "karantine"] as const;

const STATUS_TABS: ReadonlyArray<StatusTabDef<UserCommentTabStatus>> = [
  { value: "all",       label: "Все",      icon: MessageSquare, iconColor: "text-muted-foreground" },
  { value: "pending",   label: "Ожидают",  icon: MessageSquare, iconColor: "text-yellow-500" },
  { value: "approved",  label: "Одобрены", icon: MessageSquare, iconColor: "text-green-500" },
  { value: "rejected",  label: "Отклонены", icon: MessageSquare, iconColor: "text-red-500" },
  { value: "spam",      label: "Спам",     icon: MessageSquare, iconColor: "text-orange-500" },
  { value: "karantine", label: "Карантин", icon: MessageSquare, iconColor: "text-blue-500" },
];

function CommentStatusBadge({ status, trashed }: { status: string; trashed: boolean }) {
  if (trashed) return <Badge variant="outline">Карантин</Badge>;
  switch (status) {
    case "approved":  return <Badge variant="success">Одобрен</Badge>;
    case "rejected":  return <Badge variant="destructive">Отклонён</Badge>;
    case "spam":      return <Badge variant="secondary">Спам</Badge>;
    default:          return <Badge variant="warning">Ожидает</Badge>;
  }
}

export function DiaryCommentsTab({ userId }: DiaryCommentsTabProps) {
  const basePath = `/users/${userId}/diary-comments`;
  const { searchParams, replace } = useTabUrl(basePath);

  const status = parseEnumParam(searchParams, "status", STATUS_VALUES, "all");
  const page = parsePageParam(searchParams);

  const { data, isLoading, isError, refetch } = useUserDiaryComments(userId, {
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
              className="p-4 border border-border rounded-lg bg-card hover:bg-muted/30 transition-colors space-y-2"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm line-clamp-3 break-words">{c.content}</p>
                <CommentStatusBadge status={c.status} trashed={c.trashed} />
              </div>

              <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {c.diary && (
                  <span>
                    под постом:{" "}
                    <Link
                      href={`/moderation/diary/${c.diary.id}`}
                      className="hover:text-foreground underline underline-offset-2"
                    >
                      {c.diary.title || `#${c.diary.id}`}
                    </Link>
                    {c.diary.trashed && " (удалён)"}
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
          href="/moderation/diary-comments"
          className="inline-flex items-center gap-1 hover:text-foreground underline underline-offset-2"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Модерировать комментарии в общей очереди
        </Link>
      </div>
    </div>
  );
}
