// app/(admin)/communication/chats/_components/chats-page-client.tsx
"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, MessageCircle, Search, X, RefreshCw,
} from "lucide-react";
import { useChatsList } from "@/hooks/admin/use-chats";
import { ChatList } from "./chat-list";
import { ChatDetailPanel, ChatDetailEmpty } from "./chat-detail-panel";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants";

const PER_PAGE = 20;

// ============================================================
// Главная страница: список чатов слева + переписка справа
// ============================================================
export function ChatsPageClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Инициализация из URL — ?q=N (поиск или ссылка из журнала),
  // ?lock=locked|unlocked, ?page=N.
  const initialSearch = searchParams.get("q") ?? "";

  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [lockFilter, setLockFilter] = useState(searchParams.get("lock") ?? "all");
  const [page, setPage] = useState(parseInt(searchParams.get("page") ?? "1", 10));
  const [activeChatId, setActiveChatId] = useState<number | null>(null);

  const activeListItemRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Sync URL ---
  // activeChatId хранится только в React state, не в URL — это позволяет
  // ссылке из журнала ?q=16 оставаться чистой без дублирования.
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (lockFilter !== "all") params.set("lock", lockFilter);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : pathname, { scroll: false });
  }, [search, lockFilter, page, router, pathname]);

  // --- Debounce search ---
  // Таймер в ref, чтобы можно было отменить мгновенно при смене фильтра.
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
      // Если юзер вводит текст — снимаем фильтр блокировки,
      // иначе может ничего не найтись (искомый чат может быть в locked).
      if (search !== "") {
        setLockFilter("all");
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [search]);

  // --- Запрос списка чатов ---
  const { data, isLoading, isFetching, isError, refetch } = useChatsList({
    q: debouncedSearch,
    lock: lockFilter,
    page,
    per_page: PER_PAGE,
  });

  const queryClient = useQueryClient();

  const items = useMemo(() => data?.data ?? [], [data]);
  const meta = data?.meta;
  const counts = data?.counts;

  const isFirstLoad = isLoading && !data;
  const showEmpty = !isLoading && !isFetching && items.length === 0;

  // --- Авто-выбор чата при поиске по ID ---
  const isIdSearch = debouncedSearch !== "" && /^\d+$/.test(debouncedSearch);
  const searchedId = isIdSearch ? parseInt(debouncedSearch, 10) : null;

  useEffect(() => {
    if (searchedId && items.length > 0) {
      const match = items.find((c) => c.id === searchedId);
      if (match && match.id !== activeChatId) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- синхронизация search→select
        setActiveChatId(match.id);
      }
    }
  }, [searchedId, items, activeChatId]);

  // --- Скролл к активному чату в списке ---
  useEffect(() => {
    if (activeListItemRef.current) {
      activeListItemRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeChatId]);

  // --- Handlers ---
  const handleSelectChat = (chatId: number) => setActiveChatId(chatId);

  const handleSetLockFilter = (filter: string) => {
    // Мгновенно отменяем pending debounce, чтобы старый поиск не «доехал» до API.
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setLockFilter(filter);
    setSearch("");
    setDebouncedSearch("");
    setPage(1);
    setActiveChatId(null);
  };

  const handleClearSearch = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setSearch("");
    setDebouncedSearch("");
    setActiveChatId(null);
    setPage(1);
  };

  const handleRefresh = useCallback(async () => {
    // Принудительно перезапрашиваем список (минуя staleTime)
    // и инвалидируем детали активного чата — чтобы подхватить новые сообщения.
    await Promise.all([
      refetch(),
      queryClient.invalidateQueries({ queryKey: ["admin", "chats", "detail"] }),
    ]);
  }, [refetch, queryClient]);

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <MessageCircle className="w-6 h-6" />
              Чаты пользователей
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Просмотр и модерация переписок
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            title="Обновить списки"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            Обновить
          </Button>

          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
            <Input
              type="search"
              placeholder="Поиск по имени, id чата..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-8"
            />
            {search && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground z-10"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Split view: список + переписка */}
      <div className="grid grid-cols-1 lg:grid-cols-[30rem_1rem_1fr] gap-6 bg-card border border-border rounded-lg p-4 min-h-[calc(100vh-16rem)]">
        <ChatList
          items={items}
          counts={counts}
          page={page}
          lastPage={meta?.last_page ?? 1}
          isLoading={isLoading}
          isFetching={isFetching}
          isError={isError}
          isFirstLoad={isFirstLoad}
          showEmpty={showEmpty}
          activeChatId={activeChatId}
          searchedId={searchedId}
          isIdSearch={isIdSearch}
          lockFilter={lockFilter}
          activeListItemRef={activeListItemRef}
          onSelectChat={handleSelectChat}
          onSetLockFilter={handleSetLockFilter}
          onSetPage={setPage}
          onRetry={refetch}
        />

        {/* Правая панель: переписка */}
        <div className="lg:col-span-2 flex flex-col bg-muted/10 rounded-lg p-4">
          {activeChatId ? (
            <ChatDetailPanel chatId={activeChatId} />
          ) : (
            <ChatDetailEmpty />
          )}
        </div>
      </div>
    </div>
  );
}