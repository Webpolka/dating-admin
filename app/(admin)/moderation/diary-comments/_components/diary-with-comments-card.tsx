// app/(admin)/moderation/diary-comments/_components/diary-with-comments-card.tsx
"use client";

import { useRouter } from "next/navigation";

import {
  type DiaryWithComments,
  type DiaryCommentItem,
} from "@/hooks/admin/use-diaries";
import { UserBadge } from "@/components/admin/user-badge";
import type { UserBadgeData } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Globe, User as UserIcon, EyeOff } from "lucide-react";

import { DiaryCommentItemRow } from "./diary-comment-item";

export function DiaryWithCommentsCard({
  diary,
  searchedId,
  statusFilter,
  isKarantine,
}: {
  diary: DiaryWithComments;
  searchedId: number | null;
  statusFilter: string;
  isKarantine: boolean;
}) {
  const router = useRouter();

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden flex flex-col">
      {/* Шапка поста */}
      <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20 flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-foreground">Пост:</span>
          <button
            onClick={() => router.push(`/moderation/diary/${diary.id}`)}
            className="text-foreground/80 hover:text-primary transition-colors"
          >
            {diary.title}
          </button>
          
          {diary.diary_rubric && (
            <Badge
              variant={diary.diary_rubric.is_active ? "outline" : "secondary"}
              className={`text-[10px] gap-1.5 max-w-full px-2 py-0.5 ${!diary.diary_rubric.is_active ? "opacity-60" : ""}`}
              title={
                (diary.diary_rubric.is_personal ? "Личная рубрика автора" : "Системная рубрика (общая)") +
                (!diary.diary_rubric.is_active ? " (скрыта)" : "")
              }
            >
              {diary.diary_rubric.is_personal ? (
                <UserIcon className="w-3.5 h-3.5 shrink-0 text-purple-500" />
              ) : (
                <Globe className="w-3.5 h-3.5 shrink-0 text-blue-500" />
              )}              
              <span className="truncate">{diary.diary_rubric.name}</span>
              {!diary.diary_rubric.is_active && <EyeOff className="w-3 h-3 shrink-0 text-muted-foreground" />}
            </Badge>
          )}
        </div>

        {diary.user && (
          <button
            onClick={() => router.push(`/users/${diary.user!.id}`)}
            className="flex items-center gap-2 text-left"
          >
            <span className="text-xs text-muted-foreground">Автор:</span>
            <UserBadge user={diary.user as unknown as UserBadgeData} size="sm" showEmail={true} />
          </button>
        )}
      </div>

      {/* Дерево комментариев */}
      <div className="p-4 space-y-3 bg-card">
        {diary.comments.length === 0 ? (
          <p className="text-sm text-muted-foreground italic text-center py-4">
            Нет комментариев под этим постом
          </p>
        ) : (
          diary.comments.map((comment: DiaryCommentItem) => (
            <DiaryCommentItemRow
              key={comment.id}
              comment={comment}
              searchedId={searchedId}
              statusFilter={statusFilter}
              isKarantine={isKarantine}
              isReply={false}
            />
          ))
        )}
      </div>
    </div>
  );
}