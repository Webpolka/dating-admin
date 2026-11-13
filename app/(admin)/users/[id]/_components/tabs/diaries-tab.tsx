"use client";

// app/(admin)/users/[id]/_components/tabs/diaries-tab.tsx
//
// Таб «Дневники»: дневники, написанные пользователем.
//
// Per-user листинг: GET /admin/users/{userId}/diaries?status=&trashed=&page=
// (UserListingsController::diaries, формат айтемов 1:1 с глобальным списком).
// Модерация — в глобальном разделе /moderation/diary (ссылка с каждой строки).

import { BookOpen, Eye, Heart, MessageSquare, ExternalLink } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger,
} from "@/components/ui/select";
import { MiniPagination } from "@/components/admin/mini-pagination";
import { StatusTabs, type StatusTabDef } from "@/components/admin/status-tabs";
import { TabError, TabLoading } from "@/components/admin/tab-states";
import { useTabUrl, parseEnumParam, parsePageParam } from "@/hooks/admin/use-tab-url";
import { useUserDiaries } from "@/hooks/admin/use-users";
import { formatDateTime } from "@/lib/format";
import type { UserDiaryTabStatus, UserDiaryTrashedFilter } from "@/lib/api/users";

interface DiariesTabProps {
  userId: number;
}

const STATUS_VALUES = ["all", "draft", "pending", "published", "rejected"] as const;
const TRASHED_VALUES = ["without", "with", "only"] as const;

const STATUS_TABS: ReadonlyArray<StatusTabDef<UserDiaryTabStatus>> = [
  { value: "all",       label: "Все",         icon: BookOpen, iconColor: "text-muted-foreground" },
  { value: "published", label: "Опубликованы", icon: BookOpen, iconColor: "text-green-500" },
  { value: "pending",   label: "На модерации", icon: BookOpen, iconColor: "text-yellow-500" },
  { value: "rejected",  label: "Отклонены",    icon: BookOpen, iconColor: "text-red-500" },
  { value: "draft",     label: "Черновики",    icon: BookOpen, iconColor: "text-muted-foreground" },
];

const TRASHED_LABELS: Record<UserDiaryTrashedFilter, string> = {
  without: "Без удалённых",
  with: "С удалёнными",
  only: "Только удалённые",
};

function DiaryStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "published": return <Badge variant="success">Опубликован</Badge>;
    case "pending":   return <Badge variant="warning">На модерации</Badge>;
    case "rejected":  return <Badge variant="destructive">Отклонён</Badge>;
    case "draft":     return <Badge variant="secondary">Черновик</Badge>;
    default:          return <Badge variant="secondary">{status}</Badge>;
  }
}

export function DiariesTab({ userId }: DiariesTabProps) {
  const basePath = `/users/${userId}/diaries`;
  const { searchParams, replace } = useTabUrl(basePath);

  const status = parseEnumParam(searchParams, "status", STATUS_VALUES, "all");
  const trashed = parseEnumParam(searchParams, "trashed", TRASHED_VALUES, "without");
  const page = parsePageParam(searchParams);

  const { data, isLoading, isError, refetch } = useUserDiaries(userId, {
    status,
    trashed,
    page,
  });

  if (isLoading || !data) return <TabLoading label="Загрузка дневников..." />;
  if (isError) return <TabError label="Не удалось загрузить дневники" onRetry={refetch} />;

  const diaries = data.data;
  const counts = data.counts;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
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
          getCount={(v) => (v === "all" ? counts.all : counts[v])}
        />

        <Select
          value={trashed}
          onValueChange={(v) =>
            replace((p) => {
              if (v !== "without") p.set("trashed", v ?? "without");
              else p.delete("trashed");
              p.delete("page");
            })
          }
        >
          <SelectTrigger className="w-44 h-9">
            {TRASHED_LABELS[trashed]}
          </SelectTrigger>
          <SelectContent>
            {TRASHED_VALUES.map((v) => (
              <SelectItem key={v} value={v}>{TRASHED_LABELS[v]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {diaries.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground py-12">
          Нет дневников в этой категории.
        </div>
      ) : (
        <div className="space-y-2">
          {diaries.map((d) => (
            <div
              key={d.id}
              className="flex items-center gap-4 p-4 border border-border rounded-lg bg-card hover:bg-muted/30 transition-colors"
            >
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    href={`/moderation/diary/${d.id}`}
                    className="text-sm font-medium hover:underline truncate"
                  >
                    {d.title || "Без названия"}
                  </Link>
                  {d.trashed && <Badge variant="outline">Удалён</Badge>}
                  {d.status === "published" && d.diary_rubric?.is_personal && (
                    <Badge variant="secondary">личная рубрика</Badge>
                  )}
                </div>
                <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {d.diary_rubric && <span>Рубрика: {d.diary_rubric.name}</span>}
                  <span className="inline-flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" /> {d.views_count}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5" /> {d.comments_count}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5" /> {d.likes_count}
                  </span>
                  <span>создан {formatDateTime(d.created_at)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <DiaryStatusBadge status={d.status} />
                <Link
                  href={`/moderation/diary/${d.id}`}
                  aria-label="Открыть в модерации"
                  className="inline-flex items-center justify-center h-9 w-9 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </Link>
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
    </div>
  );
}
