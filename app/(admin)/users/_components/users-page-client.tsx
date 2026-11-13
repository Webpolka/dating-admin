"use client";

// app/(admin)/users/_components/users-page-client.tsx
//
// Страница /users — список пользователей.
// Фильтры синхронизируются с URL (?q=&status=&gender=&sub=&verified=&sort=&page=),
// чтобы ссылку на отфильтрованный список можно было расшарить.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, FilterX, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { useAdminUser } from "@/components/admin/admin-user-context";
import { getInitialUrlParam } from "@/lib/url-params";
import { useUsers, useUsersStats, useBanUser, useUnbanUser, useDeactivateUser, useRestoreUser } from "@/hooks/admin/use-users";
import type { AdminUserListItem, BanType, BanReason, DeletionReason } from "@/lib/api/users";
import { UsersTable } from "./users-table";
import { BanUserDialog } from "./ban-user-dialog";
import { DeactivateUserDialog } from "./deactivate-user-dialog";

// ============================================================
// Фильтры
// ============================================================

interface Filters {
  q: string;
  status: string;
  gender: string;
  sub: string;
  verified: string;
  sort: "asc" | "desc";
  page: number;
}

const DEFAULTS: Filters = { q: "", status: "", gender: "", sub: "", verified: "", sort: "desc", page: 1 };

const STATUS_OPTIONS: Record<string, string> = {
  all: "Все статусы",
  active: "Активные",
  banned: "Забанены",
  shadowbanned: "Теневой бан",
  deactivated: "Деактивированы",
};

const GENDER_OPTIONS: Record<string, string> = {
  all: "Любой пол",
  male: "Мужчины",
  female: "Женщины",
};

const SUB_OPTIONS: Record<string, string> = {
  all: "Все подписки",
  vip_only: "Только VIP",
  premium_only: "Только Premium",
  both: "VIP + Premium",
  none: "Без подписок",
};

const VERIFIED_OPTIONS: Record<string, string> = {
  all: "Верификацию не учитывать",
  yes: "Верифицированные",
  no: "Без верификации",
};

// ============================================================
// Состояния диалогов
// ============================================================

type BanState = { userId: number; type: BanType } | null;
type DeactivateState = { userId: number; userName: string } | null;
type ConfirmState = { action: "unban" | "restore"; user: AdminUserListItem } | null;

/**
 * Номера страниц для пагинации: 1 … (n-1) n (n+1) … last.
 * "all"-значения отфильтрованы, дубли схлопнуты через Set.
 */
function pageItems(cur: number, last: number): (number | "…")[] {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
  const nums = [...new Set([1, last, cur - 1, cur, cur + 1])]
    .filter((n) => n >= 1 && n <= last)
    .sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  let prev = 0;
  for (const n of nums) {
    if (n - prev > 1) out.push("…");
    out.push(n);
    prev = n;
  }
  return out;
}

// ============================================================
// Компонент
// ============================================================

export function UsersPageClient() {
  const router = useRouter();
  const admin = useAdminUser();

  // Действия над юзерами доступны только admin/moderator (сверка с бэком:
  // группа admin.role:admin,moderator в routes/admin.php).
  const canManage = admin?.role === "admin" || admin?.role === "moderator";

  const [filters, setFilters] = useState<Filters>(DEFAULTS);
  const [searchInput, setSearchInput] = useState("");
  const [hydrated, setHydrated] = useState(false); // ждём mount, читаем URL один раз

  const [banTarget, setBanTarget] = useState<BanState>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<DeactivateState>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);

  // --- Первичная гидрация фильтров из URL ---
  useEffect(() => {
    const f: Filters = {
      q: getInitialUrlParam("q"),
      status: getInitialUrlParam("status"),
      gender: getInitialUrlParam("gender"),
      sub: getInitialUrlParam("sub"),
      verified: getInitialUrlParam("verified"),
      sort: getInitialUrlParam("sort") === "asc" ? "asc" : "desc",
      page: Math.max(1, Number(getInitialUrlParam("page")) || 1),
    };
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFilters(f);
    setSearchInput(f.q);
    setHydrated(true);
  }, []);

  // --- Дебаунс поиска (400 мс) ---
  useEffect(() => {
    if (!hydrated) return;
    const t = setTimeout(() => {
      setFilters((f) => (f.q === searchInput ? f : { ...f, q: searchInput, page: 1 }));
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput, hydrated]);

  // --- Синхронизация фильтров → URL (replace, не push) ---
  useEffect(() => {
    if (!hydrated) return;
    const p = new URLSearchParams();
    if (filters.q) p.set("q", filters.q);
    if (filters.status) p.set("status", filters.status);
    if (filters.gender) p.set("gender", filters.gender);
    if (filters.sub) p.set("sub", filters.sub);
    if (filters.verified) p.set("verified", filters.verified);
    if (filters.sort !== "desc") p.set("sort", "asc");
    if (filters.page > 1) p.set("page", String(filters.page));
    const qs = p.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }, [filters, hydrated, router]);

  // --- Данные ---
  const { data, isLoading, isFetching } = useUsers(
    {
      q: filters.q || undefined,
      status: filters.status || undefined,
      gender: filters.gender || undefined,
      sub: filters.sub || undefined,
      verified: filters.verified || undefined,
      sort: filters.sort,
      page: filters.page,
    },
    hydrated,
  );
  const { data: stats } = useUsersStats();

  const ban = useBanUser();
  const unban = useUnbanUser();
  const deactivate = useDeactivateUser();
  const restore = useRestoreUser();

  const users = data?.data ?? [];
  const hasFilters = !!(filters.q || filters.status || filters.gender || filters.sub || filters.verified);
  const trimmedQ = filters.q.trim();
  const highlightId = /^\d+$/.test(trimmedQ) ? Number(trimmedQ) : null; // точный ID подсвечиваем

  // Патч фильтров; resetPage=true сбрасывает на 1-ю страницу (для фильтров,
  // но не для пагинации).
  const set = (patch: Partial<Filters>, resetPage = true) =>
    setFilters((f) => ({ ...f, ...patch, ...(resetPage ? { page: 1 } : {}) }));

  const resetFilters = () => {
    setSearchInput("");
    set({ q: "", status: "", gender: "", sub: "", verified: "" });
  };

  // --- Хендлеры мутаций ---

  const handleBanSubmit = (type: BanType, reason: BanReason, days?: number) => {
    if (!banTarget) return;
    ban.mutate(
      { userId: banTarget.userId, type, reason, days },
      { onSuccess: () => setBanTarget(null) },
    );
  };

  const handleDeactivateSubmit = (reason: DeletionReason) => {
    if (!deactivateTarget) return;
    deactivate.mutate(
      { userId: deactivateTarget.userId, reason },
      { onSuccess: () => setDeactivateTarget(null) },
    );
  };

  const handleConfirm = () => {
    if (!confirm) return;
    const opts = { onSuccess: () => setConfirm(null) };
    if (confirm.action === "unban") unban.mutate(confirm.user.id, opts);
    if (confirm.action === "restore") restore.mutate(confirm.user.id, opts);
  };

  const confirmConfig = {
    unban: {
      title: "Снять бан?",
      desc: (u: AdminUserListItem) => `Разблокировать ${u.name}?`,
      text: "Разбанить",
      variant: "default" as const,
    },
    restore: {
      title: "Восстановить аккаунт?",
      desc: (u: AdminUserListItem) => `Восстановить удалённый аккаунт ${u.name}?`,
      text: "Восстановить",
      variant: "default" as const,
    },
  };

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Заголовок */}
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Users className="w-6 h-6" />
          Пользователи
          {data && <span className="text-sm font-normal text-muted-foreground">(всего: {data.total})</span>}
        </h1>
        <p className="text-sm text-muted-foreground">Управление аккаунтами, баны и модерация</p>
      </div>

      {/* Счётчики */}
      {stats && (
        <div className="flex items-center gap-4 flex-wrap text-xs text-muted-foreground">
          <span>Всего: <b className="text-foreground">{stats.total}</b></span>
          <span>Бан: <b className="text-red-500">{stats.banned}</b></span>
          <span>Теневой: <b className="text-yellow-500">{stats.shadowbanned}</b></span>
          <span>VIP: <b className="text-blue-500">{stats.vip}</b></span>
          <span>Premium: <b className="text-orange-500">{stats.premium}</b></span>
          <span>Верифицированы: <b className="text-sky-500">{stats.verified}</b></span>
        </div>
      )}

      {/* Фильтры + поиск */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={filters.status || "all"} onValueChange={(v) => set({ status: v && v !== "all" ? v : "" })}>
            <SelectTrigger className="w-38">
              <SelectValue>
                {(v: string | null) => (v === null ? "Все статусы" : STATUS_OPTIONS[v] ?? v)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_OPTIONS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.gender || "all"} onValueChange={(v) => set({ gender: v && v !== "all" ? v : "" })}>
            <SelectTrigger className="w-36">
              <SelectValue>
                {(v: string | null) => (v === null ? "Любой пол" : GENDER_OPTIONS[v] ?? v)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(GENDER_OPTIONS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.sub || "all"} onValueChange={(v) => set({ sub: v && v !== "all" ? v : "" })}>
            <SelectTrigger className="w-42">
              <SelectValue>
                {(v: string | null) => (v === null ? "Все подписки" : SUB_OPTIONS[v] ?? v)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SUB_OPTIONS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.verified || "all"} onValueChange={(v) => set({ verified: v && v !== "all" ? v : "" })}>
            <SelectTrigger className="w-[16rem]">
              <SelectValue>
                {(v: string | null) => (v === null ? "Верификацию не учитывать" : VERIFIED_OPTIONS[v] ?? v)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(VERIFIED_OPTIONS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={resetFilters}>
              <FilterX className="w-4 h-4" /> Сбросить
            </Button>
          )}
        </div>

        <div className="relative w-72">
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Имя, почта, телефон, ID, город..."
            className="pl-9 pr-8"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          {searchInput && (
            <button
              onClick={() => setSearchInput("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Очистить поиск"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Таблица */}
      <UsersTable
        users={users}
        isLoading={isLoading}
        isFetching={isFetching}
        canManage={canManage}
        sort={filters.sort}
        highlightId={highlightId}
        hasFilters={hasFilters}
        onResetFilters={resetFilters}
        onToggleSort={() => set({ sort: filters.sort === "desc" ? "asc" : "desc" })}
        onBan={(user, type) => setBanTarget({ userId: user.id, type })}
        onUnban={(user) => setConfirm({ action: "unban", user })}
        onDeactivate={(user) => setDeactivateTarget({ userId: user.id, userName: user.name })}
        onRestore={(user) => setConfirm({ action: "restore", user })}
      />

      {/* Пагинация */}
      {data && data.last_page > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="text-xs text-muted-foreground">
            Показано {data.from ?? 0} - {data.to ?? 0} из {data.total}
          </div>
          <Pagination className="w-auto mx-0">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => filters.page > 1 && set({ page: filters.page - 1 }, false)}
                  aria-disabled={filters.page <= 1}
                  className={filters.page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              {pageItems(filters.page, data.last_page).map((item, i) => (
                <PaginationItem key={i}>
                  {item === "…" ? <PaginationEllipsis /> : (
                    <PaginationLink
                      isActive={item === filters.page}
                      className="cursor-pointer"
                      onClick={() => set({ page: item as number }, false)}
                    >
                      {item}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  onClick={() => filters.page < data.last_page && set({ page: filters.page + 1 }, false)}
                  aria-disabled={filters.page >= data.last_page}
                  className={filters.page >= data.last_page ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Диалог бана */}
      <BanUserDialog
        key={banTarget ? `ban-${banTarget.userId}` : "ban-closed"}
        target={banTarget}
        isPending={ban.isPending}
        onClose={() => setBanTarget(null)}
        onSubmit={handleBanSubmit}
      />

      {/* Диалог деактивации */}
      <DeactivateUserDialog
        key={deactivateTarget ? `deact-${deactivateTarget.userId}` : "deact-closed"}
        target={deactivateTarget}
        isPending={deactivate.isPending}
        onClose={() => setDeactivateTarget(null)}
        onSubmit={handleDeactivateSubmit}
      />

      {/* Подтверждение разбана / восстановления */}
      {confirm && (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setConfirm(null)}
          title={confirmConfig[confirm.action].title}
          description={confirmConfig[confirm.action].desc(confirm.user)}
          confirmText={confirmConfig[confirm.action].text}
          variant={confirmConfig[confirm.action].variant}
          isLoading={unban.isPending || restore.isPending}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  );
}