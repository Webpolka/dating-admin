"use client";

// app/(admin)/users/[id]/_components/tabs/diaries-tab.tsx
//
// Таб «Дневники»: дневники, написанные пользователем.
//
// Per-user листинг: GET /admin/users/{userId}/diaries?rubric=&search=&page=
// (UserListingsController::diaries, формат айтемов 1:1 с глобальным списком
//  /moderation/diary — DiaryItem).
//
// Фильтры живут в URL: ?rubric=all|none|<id> и ?search=<text>.
// Список рубрик для кнопок приходит отдельным полем `rubrics` в ответе —
// это только те рубрики, в которых у юзера реально есть посты.
// Карантин (soft-deleted) виден бейджем строки — withTrashed на бэке.
// Действия (модерация) — в глобальном разделе /moderation/diary/{id}.

import { useEffect, useState } from "react";
import { Eye, Heart, MessageSquare, Globe, User, AlertTriangle, NotebookPen } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MiniPagination } from "@/components/admin/mini-pagination";
import { SearchInput } from "@/components/admin/search-input";
import { TabError, TabLoading } from "@/components/admin/tab-states";
import { useTabUrl, parsePageParam } from "@/hooks/admin/use-tab-url";
import { useUserDiaries } from "@/hooks/admin/use-users";
import { formatDateTime } from "@/lib/format";
import type { UserDiariesParams, UserDiaryRubricFilter } from "@/lib/api/users";
import type { DiaryItem } from "@/hooks/admin/use-diaries";

interface DiariesTabProps {
  userId: number;
}

// 300ms — тот же debounce, что был в blade-табе (wire:model.live.debounce.300ms).
const SEARCH_DEBOUNCE_MS = 300;

function DiaryStatusBadge({ status, trashed }: { status: string; trashed: boolean }) {
  // Карантин показываем ВМЕСТО статуса — как в blade-эталоне.
  if (trashed) return <Badge variant="outline">Карантин</Badge>;
  switch (status) {
    case "published": return <Badge variant="success">Опубл.</Badge>;
    case "pending":   return <Badge variant="warning">Модерация</Badge>;
    case "rejected":  return <Badge variant="destructive">Отклонено</Badge>;
    case "draft":     return <Badge variant="secondary">Черновик</Badge>;
    default:          return <Badge variant="secondary">{status}</Badge>;
  }
}

export function DiariesTab({ userId }: DiariesTabProps) {
  const basePath = `/users/${userId}/diaries`;
  const { searchParams, replace } = useTabUrl(basePath);

  // rubric: 'all' | 'none' | <id>. Из URL читаем как строку, id парсим на месте.
  const rubricParam = searchParams.get("rubric") ?? "all";
  const rubric: UserDiariesParams["rubric"] =
    rubricParam === "all" || rubricParam === "none" ? rubricParam : Number(rubricParam) || "all";
  const page = parsePageParam(searchParams);

  // Поиск: локальное значение для инпута + debounced для запроса.
  // URL — источник правды для debounced-значения (чтобы работали кнопки назад/вперёд
  // и shareable-ссылки). Инпут мгновенно реагирует на ввод, в URL пишет через debounce.
  const [searchInput, setSearchInput] = useState(searchParams.get("search") ?? "");

  // Синхронизируем локальное поле, если URL изменился снаружи (навигация, очистка).
  useEffect(() => {
    setSearchInput(searchParams.get("search") ?? "");
  }, [searchParams]);

  // Debounce: пишем search в URL через 300ms после последнего нажатия клавиши.
  // Сбрасываем page — новый поиск должен начинаться с 1-й страницы.
  useEffect(() => {
    const t = setTimeout(() => {
      replace((p) => {
        if (searchInput.trim()) p.set("search", searchInput.trim());
        else p.delete("search");
        p.delete("page");
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  // Для запроса берём уже commited-значение из URL (debounced).
  const search = searchParams.get("search") ?? undefined;

  const { data, isLoading, isError, refetch } = useUserDiaries(userId, { rubric, search, page });

  if (isLoading || !data) return <TabLoading label="Загрузка дневников..." />;
  if (isError) return <TabError label="Не удалось загрузить дневники" onRetry={refetch} />;

  const diaries = data.data;
  const rubrics = data.rubrics;

  /** Смена рубрики: патчим только rubric + сбрасываем page. */
  const setRubric = (next: UserDiariesParams["rubric"]) => {
    replace((p) => {
      if (next === "all") p.delete("rubric");
      else p.set("rubric", String(next));
      p.delete("page");
    });
  };

  /** Активна ли кнопка рубрики. */
  const isRubricActive = (value: UserDiariesParams["rubric"]) => rubric === value;

  return (
    <div className="space-y-4">
      {/* === Фильтры: кнопки рубрик + поиск === */}
      <div className="flex justify-between gap-4 flex-wrap">
        <div className="flex flex-wrap gap-1.5">
          <Button
            variant={isRubricActive("all") ? "default" : "secondary"}
            size="sm"
            onClick={() => setRubric("all")}
          >
            Все записи
          </Button>
          <Button
            variant={isRubricActive("none") ? "default" : "secondary"}
            size="sm"
            onClick={() => setRubric("none")}
          >
            Без рубрики
          </Button>
          {rubrics.map((r: UserDiaryRubricFilter) => (
            <Button
              key={r.id}
              variant={isRubricActive(r.id) ? "default" : "secondary"}
              size="sm"
              onClick={() => setRubric(r.id)}
            >
              <span className="flex items-center gap-1">
                {r.is_personal ? (
                  <User className="w-3 h-3 text-muted-foreground" />
                ) : (
                  <Globe className="w-3 h-3 text-blue-500" />
                )}
                {r.name}
              </span>
            </Button>
          ))}
        </div>

        <div className="flex justify-end">
          <SearchInput
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Поиск по названию..."
          />
        </div>
      </div>

      {/* === Список === */}
      {diaries.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <NotebookPen className="w-12 h-12 opacity-30 mx-auto mb-2" />
          <p className="text-sm">У пользователя нет записей в дневнике</p>
        </div>
      ) : (
        <div className="space-y-2">
          {diaries.map((d: DiaryItem) => (
            <div
              key={d.id}
              className={`flex items-center gap-4 p-3 border border-border rounded-lg bg-card hover:bg-muted/30 transition-colors ${
                d.trashed ? "opacity-50 bg-red-500/5" : ""
              }`}
            >
              <div className="min-w-0 flex-1 space-y-1.5">
                {/* Заголовок + ID */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    href={`/moderation/diary/${d.id}`}
                    className="text-xs font-mono text-blue-500 hover:underline"
                    title="Открыть запись"
                  >
                    #{d.id}
                  </Link>
                  <Link
                    href={`/moderation/diary/${d.id}`}
                    className="text-sm font-medium hover:text-primary line-clamp-1"
                  >
                    {d.title || "Без названия"}
                  </Link>
                </div>

                {/* Рубрика */}
                <div className="flex items-center flex-wrap gap-1.5">
                  {d.diary_rubric ? (
                    <div className="flex items-center gap-1">
                      {!d.diary_rubric.is_active && (
                        <AlertTriangle
                          className="w-3.5 h-3.5 text-yellow-500 shrink-0"
                          // title="Рубрика скрыта админом (не видна юзерам)"
                        />
                      )}
                      <Badge variant={d.diary_rubric.is_active ? "outline" : "secondary"}>
                        <span className="flex items-center gap-1">
                          {d.diary_rubric.is_personal ? (
                            <User className="w-3 h-3 text-muted-foreground" />
                          ) : (
                            <Globe className="w-3 h-3 text-blue-500" />
                          )}
                          {d.diary_rubric.name}
                        </span>
                      </Badge>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">Без рубрики</span>
                  )}
                </div>

                {/* Метрики + дата */}
                <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" /> {d.views_count}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5" /> {d.comments_count}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5" /> {d.likes_count}
                  </span>
                  <span>{formatDateTime(d.created_at)}</span>
                </div>
              </div>

              {/* Статус справа */}
              <div className="flex items-center gap-2 shrink-0">
                <DiaryStatusBadge status={d.status} trashed={d.trashed} />
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
