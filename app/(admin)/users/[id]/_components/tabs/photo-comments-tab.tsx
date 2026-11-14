"use client";

// app/(admin)/users/[id]/_components/tabs/photo-comments-tab.tsx
//
// Таб «Комм. фото»: две колонки — комментарии, НАПИСАННЫЕ пользователем,
// и комментарии под ФОТО пользователя. Пагинация обеих живёт в URL
// (?made_page=N&received_page=N).
//
// Per-user листинг: GET /admin/users/{userId}/photo-comments?made_page=&received_page=
// (UserListingsController::photoComments, две независимые пагинации по 5,
// формат айтема 1:1 с глобальной очередью /moderation/photo-comments).
// Действия (approve/reject/...) — в глобальной очереди модерации, туда
// ведёт ссылка-якорь на каждой строке.

import { MessageCircle, Inbox, ExternalLink } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { MiniPagination } from "@/components/admin/mini-pagination";
import { TabError, TabLoading } from "@/components/admin/tab-states";
import { UserBadge } from "@/components/admin/user-badge";
import { useTabUrl, parsePageParam } from "@/hooks/admin/use-tab-url";
import { useUserPhotoComments } from "@/hooks/admin/use-users";
import {
  getCommentRejectReasonLabel,
  getCommentRejectReasonColor,
} from "@/hooks/admin/use-photo-comments";
import { formatDateTime, formatRelativeTime } from "@/lib/format";
import type { UserBadgeData } from "@/lib/types";
import type {
  UserPhotoCommentItem,
  UserPhotoCommentsPaginated,
} from "@/lib/api/users";

interface PhotoCommentsTabProps {
  userId: number;
}

export function PhotoCommentsTab({ userId }: PhotoCommentsTabProps) {
  const basePath = `/users/${userId}/photo-comments`;
  const { searchParams, replace } = useTabUrl(basePath);

  const madePage = parsePageParam(searchParams, "made_page");
  const receivedPage = parsePageParam(searchParams, "received_page");

  const { data, isLoading, isError, refetch } = useUserPhotoComments(userId, {
    made_page: madePage,
    received_page: receivedPage,
  });

  if (isLoading || !data) return <TabLoading label="Загрузка комментариев..." />;
  if (isError) return <TabError label="Не удалось загрузить комментарии" onRetry={refetch} />;

  const { made, received } = data;
  // counts ({ made, received }) здесь не используется — тотал уже виден в
  // заголовке каждой колонки через paginator.total. Поле приходит из бэка
  // для будущего использования (напр. бейджа в таб-навигации).

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CommentsColumn
          title="Написал сам"
          icon={MessageCircle}
          iconColor="text-blue-500"
          paginator={made}
          onChangePage={(next) =>
            replace((p) => (next <= 1 ? p.delete("made_page") : p.set("made_page", String(next))))
          }
          emptyText="Пользователь не оставлял комментариев."
          renderRow={(c) => <MadeRow key={c.id} comment={c} />}
        />

        <CommentsColumn
          title="На его фото"
          icon={Inbox}
          iconColor="text-destructive"
          paginator={received}
          onChangePage={(next) =>
            replace((p) =>
              next <= 1 ? p.delete("received_page") : p.set("received_page", String(next)),
            )
          }
          emptyText="Под фото пользователя нет комментариев."
          renderRow={(c) => <ReceivedRow key={c.id} comment={c} />}
        />
      </div>

      <div className="text-xs text-muted-foreground">
        <ExternalLink className="w-3.5 h-3.5 inline mr-1" />
        <Link
          href="/moderation/photo-comments"
          className="hover:text-foreground underline underline-offset-2"
        >
          Модерировать комментарии в общей очереди
        </Link>
      </div>
    </div>
  );
}

// ============================================
// КОЛОНКА КОММЕНТАРИЕВ
// ============================================

interface CommentsColumnProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  paginator: UserPhotoCommentsPaginated;
  onChangePage: (page: number) => void;
  emptyText: string;
  renderRow: (comment: UserPhotoCommentItem) => React.ReactNode;
}

function CommentsColumn({
  title,
  icon: Icon,
  iconColor,
  paginator,
  onChangePage,
  emptyText,
  renderRow,
}: CommentsColumnProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Icon className={`w-4 h-4 ${iconColor}`} /> {title} ({paginator.total})
      </h3>

      {paginator.data.length === 0 ? (
        <div className="p-4 bg-muted/20 rounded-lg border border-border text-center text-xs text-muted-foreground">
          {emptyText}
        </div>
      ) : (
        <div className="space-y-2">
          {paginator.data.map(renderRow)}
          <MiniPagination
            currentPage={paginator.current_page}
            lastPage={paginator.last_page}
            from={paginator.from}
            to={paginator.to}
            total={paginator.total}
            onChangePage={onChangePage}
          />
        </div>
      )}
    </div>
  );
}

// ============================================
// БЕЙДЖ СТАТУСА (карантин показывается вместо статуса)
// ============================================

function CommentStatusBadge({ status, trashed }: { status: string; trashed: boolean }) {
  if (trashed) return <Badge variant="outline">Карантин</Badge>;
  switch (status) {
    case "approved":  return <Badge variant="success">Одобрен</Badge>;
    case "rejected":  return <Badge variant="destructive">Отклонён</Badge>;
    case "spam":      return <Badge variant="secondary">Спам</Badge>;
    default:          return <Badge variant="warning">Ожидает</Badge>;
  }
}

// ============================================
// СТРОКА «НАПИСАЛ САМ»
// Рисуем: текст/статус, под каким фото оставлен (превью + владелец), дату.
// ============================================

function MadeRow({ comment }: { comment: UserPhotoCommentItem }) {
  const photo = comment.photo;
  const rejectLabel = getCommentRejectReasonLabel(comment.reject_reason);
  const rejectColor = getCommentRejectReasonColor(comment.reject_reason);

  // thumb_url / medium_url — accessor'ы Photo; бэкенд в made-колонке селектит
  // path_thumb / path_medium, поэтому accessor'ы безопасны (колонки загружены).
  const photoSrc = photo?.thumb_url ?? photo?.medium_url ?? null;

  return (
    <div className="p-3 bg-card border border-border rounded-lg space-y-2">
      {/* Текст + статус */}
      <div className="flex items-start justify-between gap-3">
        <Link
          href={`/moderation/photo-comments?q=${comment.id}`}
          className="text-xs font-mono text-blue-500 hover:underline shrink-0"
          title="Найти в общей очереди"
        >
          #{comment.id}
        </Link>
        <CommentStatusBadge status={comment.status} trashed={comment.trashed} />
      </div>

      <p className="text-sm text-muted-foreground italic line-clamp-2 break-words">
        «{comment.content}»
      </p>

      {/* Причина отклонения (только для rejected, не для карантина) */}
      {comment.status === "rejected" && !comment.trashed && rejectLabel && rejectColor && (
        <span
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${rejectColor}`}
        >
          {rejectLabel}
        </span>
      )}

      {/* Контекст: под каким фото оставлен */}
      {photo ? (
        <div className="flex items-center gap-2 pt-1 border-t border-border/50">
          {/* Медиа-домен бэкенда — next/image тут не применим. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoSrc ?? ""}
            alt=""
            className="w-10 h-10 rounded object-cover border border-border shrink-0"
          />
          <div className="flex flex-col gap-0.5 min-w-0">
            <Link
              href={`/moderation/photos?q=${photo.id}`}
              className="text-xs font-medium text-muted-foreground hover:text-primary"
              title="Найти фото в модерации"
            >
              Фото #{photo.id}
            </Link>
            {photo.user ? (
              <Link
                href={`/users/${photo.user.id}`}
                className="hover:opacity-80 transition-opacity"
              >
                <UserBadge user={photo.user as UserBadgeData} size="sm" />
              </Link>
            ) : (
              <span className="text-[10px] text-muted-foreground italic">Юзер удалён</span>
            )}
          </div>
        </div>
      ) : (
        <span className="text-xs text-muted-foreground italic">Фото удалено</span>
      )}

      <div className="text-[10px] text-muted-foreground" title={formatDateTime(comment.created_at)}>
        {comment.created_at ? formatRelativeTime(comment.created_at) : "—"}
      </div>
    </div>
  );
}

// ============================================
// СТРОКА «НА ЕГО ФОТО»
// Рисуем: автора комментария (avatar + name), текст/статус, дату.
// Фото тут не превью — только ссылка на модерацию (бэкенд прислал photo.id).
// ============================================

function ReceivedRow({ comment }: { comment: UserPhotoCommentItem }) {
  const rejectLabel = getCommentRejectReasonLabel(comment.reject_reason);
  const rejectColor = getCommentRejectReasonColor(comment.reject_reason);

  return (
    <div className="p-3 bg-card border border-border rounded-lg space-y-2">
      {/* Автор комментария (другой юзер) */}
      {comment.user ? (
        <Link href={`/users/${comment.user.id}`} className="hover:opacity-80 transition-opacity">
          <UserBadge user={comment.user as UserBadgeData} size="sm" />
        </Link>
      ) : (
        <span className="text-sm text-muted-foreground italic">Юзер удалён</span>
      )}

      {/* Текст + статус */}
      <div className="flex items-start justify-between gap-3">
        <Link
          href={`/moderation/photo-comments?q=${comment.id}`}
          className="text-xs font-mono text-blue-500 hover:underline shrink-0"
          title="Найти в общей очереди"
        >
          #{comment.id}
        </Link>
        <CommentStatusBadge status={comment.status} trashed={comment.trashed} />
      </div>

      <p className="text-sm text-muted-foreground italic line-clamp-2 break-words">
        «{comment.content}»
      </p>

      {/* Причина отклонения */}
      {comment.status === "rejected" && !comment.trashed && rejectLabel && rejectColor && (
        <span
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${rejectColor}`}
        >
          {rejectLabel}
        </span>
      )}

      <div className="text-[10px] text-muted-foreground" title={formatDateTime(comment.created_at)}>
        {comment.created_at ? formatRelativeTime(comment.created_at) : "—"}
      </div>
    </div>
  );
}
