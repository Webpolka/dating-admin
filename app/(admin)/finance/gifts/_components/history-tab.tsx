// app/(admin)/finance/gifts/_components/history-tab.tsx
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  useGiftsHistoryList,
  useHideUserGift,
  useRestoreUserGift,
  type UserGiftItem,
} from "@/hooks/admin/use-gifts";
import { extractErrorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { UserBadge } from "@/components/admin/user-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Search, X, Loader2, History, Eye, EyeOff, ArrowRight, Lock, LockOpen, ImageOff, AlertCircle, RefreshCw,
} from "lucide-react";
import { SEARCH_DEBOUNCE_MS, PER_PAGE, TYPE_OPTIONS, getInitialUrlParam } from "./_shared";
import { ListPagination } from "@/components/admin/list-pagination";

export function HistoryTab({ onGiftClick }: { onGiftClick: (giftId: number) => void }) {
     const router = useRouter();

  // Initial state — пустой (для SSR). После mount читаем URL синхронно.
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [privacyFilter, setPrivacyFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [urlInitialized, setUrlInitialized] = useState(false);
  useEffect(() => {
          // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearch(getInitialUrlParam("q"));
    setDebouncedSearch(getInitialUrlParam("q"));
    setPrivacyFilter(getInitialUrlParam("privacy") || "all");
    setPage(parseInt(getInitialUrlParam("page") || "1", 10));
    setUrlInitialized(true);
  }, []);

  const [highlightId, setHighlightId] = useState<number | null>(null);
  const [hideTarget, setHideTarget] = useState<UserGiftItem | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<UserGiftItem | null>(null);

  const highlightRowRef = useRef<HTMLTableRowElement>(null);

  // F10: URL-sync только тут. НЕ пишем URL до завершения initial mount.
  useEffect(() => {
    if (!urlInitialized) return;
    const params = new URLSearchParams();
    params.set("tab", "history");
    if (search) params.set("q", search);
    if (privacyFilter !== "all") params.set("privacy", privacyFilter);
    if (page > 1) params.set("page", String(page));
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [search, privacyFilter, page, router, urlInitialized]);

  // F7: debounce 400ms.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
      if (search !== "") setPrivacyFilter("all");
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isFetching, isError, error, refetch } = useGiftsHistoryList({
    q: debouncedSearch,
    privacy: privacyFilter,
    page,
    per_page: PER_PAGE,
  });

  const items: UserGiftItem[] = useMemo(() => data?.data ?? [], [data]);
  const meta = data?.meta;
  const counts = data?.counts;

  const isFirstLoad = isLoading && !data;
  const showEmpty = !isLoading && !isFetching && items.length === 0 && !isError;

  const isIdSearch = debouncedSearch !== "" && /^\d+$/.test(debouncedSearch);
  const searchedId = isIdSearch ? parseInt(debouncedSearch, 10) : null;

  useEffect(() => {
    if (searchedId && items.length > 0) {
      const match = items.find((g) => g.id === searchedId);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (match) setHighlightId(match.id);
    } else {
      setHighlightId(null);
    }
  }, [searchedId, items]);

  useEffect(() => {
    if (highlightRowRef.current && highlightId) {
      highlightRowRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightId]);

  const hideMutation = useHideUserGift();
  const restoreMutation = useRestoreUserGift();

  const handleHide = () => {
    if (!hideTarget) return;
    hideMutation.mutate(hideTarget.id, {
      onSettled: () => setHideTarget(null),
    });
  };

  const handleRestore = () => {
    if (!restoreTarget) return;
    restoreMutation.mutate(restoreTarget.id, {
      onSettled: () => setRestoreTarget(null),
    });
  };

  return (
    <div className="space-y-4">
      {/* Фильтры приватности + поиск */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex flex-wrap gap-1.5">
          <Button
            variant={privacyFilter === "all" ? "default" : "secondary"}
            size="sm"
            onClick={() => { setPrivacyFilter("all"); setSearch(""); setDebouncedSearch(""); setPage(1); }}
            className="gap-1.5"
          >
            Все
            <Badge variant="secondary" className="text-[10px] h-5 px-1">
              {counts?.all ?? 0}
            </Badge>
          </Button>
          <Button
            variant={privacyFilter === "public" ? "default" : "secondary"}
            size="sm"
            onClick={() => { setPrivacyFilter("public"); setSearch(""); setDebouncedSearch(""); setPage(1); }}
            className="gap-1.5"
          >
            <Eye className="w-3.5 h-3.5" /> Публичные
            <Badge variant="secondary" className="text-[10px] h-5 px-1">
              {counts?.public ?? 0}
            </Badge>
          </Button>
          <Button
            variant={privacyFilter === "private" ? "default" : "secondary"}
            size="sm"
            onClick={() => { setPrivacyFilter("private"); setSearch(""); setDebouncedSearch(""); setPage(1); }}
            className="gap-1.5"
          >
            <Lock className="w-3.5 h-3.5" /> Приватные
            <Badge variant="warning" className="text-[10px] h-5 px-1">
              {counts?.private ?? 0}
            </Badge>
          </Button>
        </div>

        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
          <Input
            type="search"
            placeholder="Поиск по имени или ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-8"
          />
          {search && (
            <button
              onClick={() => { setSearch(""); setDebouncedSearch(""); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground z-10"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Таблица истории */}
      <div className="rounded-md border border-border bg-card overflow-x-auto">
        <Table className="table-fixed w-full min-w-275">
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-14">ID</TableHead>
              <TableHead className="w-45">Отправитель</TableHead>
              <TableHead className="w-10" />
              <TableHead className="w-55">Получатель</TableHead>
              <TableHead className="w-65">Подарок</TableHead>
              <TableHead className="w-22.5">Цена</TableHead>
              <TableHead className="w-22.5 text-center">Статус</TableHead>
              <TableHead>Сообщение</TableHead>
              <TableHead className="w-30">Дата</TableHead>
              <TableHead className="w-20 text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isFirstLoad ? (
              <TableRow>
                <TableCell colSpan={10} className="py-16">
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                </TableCell>
              </TableRow>
            ) : isError ? (
              // F8: отдельная ветка ошибки загрузки.
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={10} className="h-64 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <AlertCircle className="w-16 h-16 text-destructive/50" />
                    <div>
                      <p className="text-sm font-medium text-destructive">Не удалось загрузить историю</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {extractErrorMessage(error, "Проверьте соединение с сервером")}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Повторить
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : showEmpty ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={10} className="h-64 text-center text-muted-foreground animate-in fade-in duration-300">
                  <div className="flex flex-col items-center gap-3">
                    <History className="w-16 h-16 opacity-25" />
                    <p className="text-sm font-medium">История пуста</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              items.map((ug, index) => {
                const isHighlighted = ug.id === highlightId;
                const rowClassName = [
                  "border-b border-border transition-colors",
                  isHighlighted ? "bg-blue-50 dark:bg-blue-950/40 " : "",
                  ug.is_hidden ? "opacity-60" : "",
                ].filter(Boolean).join(" ");

                return (
                  <TableRow
                    key={ug.id}
                    ref={isHighlighted ? highlightRowRef : undefined}
                    className={`${rowClassName} animate-in fade-in slide-in-from-bottom-1 duration-300`}
                    style={{
                      animationDelay: `${Math.min(index * 15, 400)}ms`,
                      animationFillMode: "backwards",
                    }}
                  >
                    <TableCell className={`text-xs font-mono whitespace-nowrap tabular-nums align-top pt-3 ${isHighlighted ? "text-primary font-bold" : "text-muted-foreground"}`}>
                      #{ug.id}
                    </TableCell>

                    {/* Отправитель */}
                    <TableCell className="align-top pt-3">
                      {ug.sender ? (
                        <button
                          onClick={() => router.push(`/admin/users/${ug.sender!.id}`)}
                          className="block text-left"
                        >
                          {/* F4: каст не нужен — GiftUser теперь = UserBadgeData */}
                          <UserBadge user={ug.sender} size="sm" showEmail={true} />
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Система/Удален</span>
                      )}
                    </TableCell>

                    <TableCell className="text-muted-foreground align-top pt-4">
                      <ArrowRight className="w-4 h-4" />
                    </TableCell>

                    {/* Получатель */}
                    <TableCell className="align-top pt-3">
                      {ug.receiver ? (
                        <button
                          onClick={() => router.push(`/admin/users/${ug.receiver!.id}`)}
                          className="block text-left"
                        >
                          {/* F4: каст не нужен — GiftUser теперь = UserBadgeData */}
                          <UserBadge user={ug.receiver} size="sm" showEmail={true} />
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Удален</span>
                      )}
                    </TableCell>

                    {/* Подарок (snapshot) — картинка + название + бейджи в ряд */}
                    <TableCell className="align-top pt-3">
                      <div className="flex items-start gap-2">
                        <div className="w-10 h-10 overflow-hidden rounded-md bg-muted shrink-0 flex items-center justify-center">
                          {ug.snapshot_image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={ug.snapshot_image_url} alt={ug.snapshot_name} className="w-full h-full object-cover" />
                          ) : (
                            <ImageOff className="w-3 h-3 text-muted-foreground/50" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          {ug.gift ? (
                            <button
                              onClick={() => onGiftClick(ug.gift!.id)}
                              className="text-xs font-medium truncate cursor-pointer hover:underline hover:text-primary transition-colors block text-left"
                              title={`Перейти к подарку #${ug.gift.id} в каталоге`}
                            >
                              {ug.snapshot_name}
                            </button>
                          ) : (
                            <span className="text-xs font-medium truncate block">{ug.snapshot_name}</span>
                          )}
                          {/* Бейджи в один ряд: приватность → категория → тип */}
                          <div className="flex items-center gap-1 mt-1 flex-wrap">
                            {/* Приватность — иконка-замочек */}
                            {ug.is_private ? (
                              <span title="Приватный подарок" className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-yellow-500/10 text-yellow-600 border border-yellow-500/20">
                                <Lock className="w-2.5 h-2.5" />
                              </span>
                            ) : (
                              <span title="Публичный подарок" className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-green-500/10 text-green-600 border border-green-500/20">
                                <LockOpen className="w-2.5 h-2.5" />
                              </span>
                            )}
                            {/* Категория (только если есть) */}
                            {ug.gift?.category_label && (
                              <Badge variant="secondary" className="text-[9px] rounded-full h-5 px-1.5">
                                {ug.gift.category_label}
                              </Badge>
                            )}
                            {/* Тип (цветной круглый) */}
                            {(() => {
                              const typeOpt = TYPE_OPTIONS.find((o) => o.value === ug.gift?.type);
                              return typeOpt ? (
                                <span className={`inline-flex items-center px-1.5 h-5 rounded-full text-[9px] font-medium border ${typeOpt.color}`}>
                                  {typeOpt.label}
                                </span>
                              ) : null;
                            })()}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="text-sm text-muted-foreground font-medium align-top pt-3">
                      {ug.snapshot_price.toLocaleString("ru-RU")} ед.
                    </TableCell>

                    <TableCell className="text-center align-top pt-3">
                      {ug.is_hidden ? (
                        <Badge variant="destructive" className="text-[10px]">Скрыт</Badge>
                      ) : (
                        <Badge variant="success" className="text-[10px]">В профиле</Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground align-top pt-3 max-w-3">
                      {ug.message ? (
                        <p className="italic line-clamp-2" title={ug.message}>&quot;{ug.message}&quot;</p>
                      ) : (
                        <span className="opacity-50">—</span>
                      )}
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap align-top pt-3">
                      {/* F6: используем formatDateTime из lib/format (не локальный) */}
                      {ug.created_at && formatDateTime(ug.created_at)}
                    </TableCell>

                    <TableCell className="text-right align-top pt-3">
                      {ug.is_hidden ? (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setRestoreTarget(ug)}
                          title="Вернуть в профиль"
                        >
                          <Eye className="w-4 h-4 text-green-500" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setHideTarget(ug)}
                          title="Скрыть из профиля"
                        >
                          <EyeOff className="w-4 h-4 text-yellow-500" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <ListPagination
        currentPage={page}
        lastPage={meta?.last_page ?? 1}
        from={meta?.from ?? null}
        to={meta?.to ?? null}
        total={meta?.total}
        onChangePage={setPage}
        disabled={isFetching}
      />

      {/* Подтверждение скрытия */}
      <ConfirmDialog
        open={hideTarget !== null}
        onOpenChange={(open) => { if (!open) setHideTarget(null); }}
        title="Скрыть подарок из профиля?"
        description={hideTarget
          ? `Подарок «${hideTarget.snapshot_name}» будет скрыт из анкеты получателя, но останется в истории для СБ. Кредиты отправителю не возвращаются.`
          : ""}
        confirmText="Скрыть"
        cancelText="Отмена"
        variant="destructive"
        isLoading={hideMutation.isPending}
        onConfirm={handleHide}
      />

      {/* Подтверждение восстановления */}
      <ConfirmDialog
        open={restoreTarget !== null}
        onOpenChange={(open) => { if (!open) setRestoreTarget(null); }}
        title="Вернуть подарок в профиль?"
        description={restoreTarget
          ? `Подарок «${restoreTarget.snapshot_name}» снова станет виден в анкете получателя.`
          : ""}
        confirmText="Вернуть"
        cancelText="Отмена"
        variant="default"
        isLoading={restoreMutation.isPending}
        onConfirm={handleRestore}
      />
    </div>
  );
}

