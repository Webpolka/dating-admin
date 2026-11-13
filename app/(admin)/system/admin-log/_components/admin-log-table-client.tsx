// app/(admin)/system/admin-log/_components/admin-log-table-client.tsx
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useAdminLogList,
  useRefreshAdminLog,
  type AdminLogItem,
} from "@/hooks/admin/use-admin-log";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
// import { toast } from "sonner";
import { format } from "date-fns";
import {
  ArrowLeft, ShieldCheck, Search, X, FilterX, Loader2, RefreshCw,
  Code, ChevronDown, ArrowDown, Globe, Users, FileText, Newspaper,
  Image as ImageIcon, MessageSquare, BookOpen, Wallet, MessageCircle,
  LifeBuoy, Globe2, Settings2, Layers, Circle, CalendarIcon
} from "lucide-react";
import { formatDate, formatTime } from "@/lib/format";
import { UserBadge } from "@/components/admin/user-badge";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants";
import { ListPagination } from "@/components/admin/list-pagination";

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  all: Layers,
  user: Users,
  profile: Users,
  page: FileText,
  blog: Newspaper,
  blog_category: FileText,
  photo: ImageIcon,
  comment: MessageSquare,
  diary: BookOpen,
  diary_comment: MessageSquare,
  transaction: Wallet,
  user_gift: Wallet,
  gift: Wallet,
  chat: MessageCircle,
  support: LifeBuoy,
  geo: Globe2,
  settings: Settings2,
};

const PER_PAGE = 15;

export function AdminLogTableClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get("q") ?? "");
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get("cat") ?? "all");
  const [adminFilter, setAdminFilter] = useState(searchParams.get("adm") ?? "");
  const [dateFilter, setDateFilter] = useState(searchParams.get("date") ?? "");
  const [page, setPage] = useState(parseInt(searchParams.get("page") ?? "1", 10));

  const highlightRowRef = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (categoryFilter !== "all") params.set("cat", categoryFilter);
    if (adminFilter) params.set("adm", adminFilter);
    if (dateFilter) params.set("date", dateFilter);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }, [search, categoryFilter, adminFilter, dateFilter, page, router]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isFetching } = useAdminLogList({
    q: debouncedSearch,
    cat: categoryFilter,
    adm: adminFilter,
    date: dateFilter,
    page,
    per_page: PER_PAGE,
  });

  const refreshMutation = useRefreshAdminLog();

  const items: AdminLogItem[] = useMemo(() => data?.data ?? [], [data]);
  const meta = data?.meta;
  const stats = data?.stats;
  const admins = data?.admins ?? [];
  const totalEntries = data?.total_entries ?? 0;

  const isHighlightedId = debouncedSearch !== "" && /^\d+$/.test(debouncedSearch)
    ? parseInt(debouncedSearch, 10)
    : null;

  useEffect(() => {
    if (highlightRowRef.current && isHighlightedId) {
      highlightRowRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isHighlightedId, items]);

  const handleResetFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setCategoryFilter("all");
    setAdminFilter("");
    setDateFilter("");
    setPage(1);
  };

  const hasFilters = search !== "" || categoryFilter !== "all" || adminFilter !== "" || dateFilter !== "";

  const isFirstLoad = isLoading && !data;
  const isRefetching = isFetching && !isFirstLoad;
  const showEmpty = !isLoading && !isFetching && items.length === 0;

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <ShieldCheck className="w-6 h-6" />
              Журнал действий
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Всего записей: {totalEntries}
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={() => refreshMutation.mutate()}
          disabled={refreshMutation.isPending}
        >
          {refreshMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
        </Button>
      </div>

      <div className="bg-card border border-border rounded-lg p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-2 pb-4 border-b border-border">
          {/* Категории */}
          {stats && Object.entries(stats).map(([cat, count]) => {
            const Icon = CATEGORY_ICONS[cat] || Circle;
            const isActive = categoryFilter === cat;
            return (
              <Button
                key={cat}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => { setCategoryFilter(cat); setSearch(""); setPage(1); }}
                className="gap-1.5"
              >
                <Icon className="w-4 h-4" />
                {cat === "all" ? "Все" : cat.charAt(0).toUpperCase() + cat.slice(1)}
                <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 text-xs font-medium tabular-nums rounded-sm bg-background/40">
                  {count}
                </span>
              </Button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={adminFilter}
            onValueChange={(v: string | null) => { setAdminFilter(v ?? ""); setSearch(""); setPage(1); }}
          >
            <SelectTrigger className="w-40 h-9">
              {adminFilter ? admins.find(a => String(a.id) === adminFilter)?.name : "Все сотрудники"}
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              <SelectItem value="">Все сотрудники</SelectItem>
              {admins.map((admin) => (
                <SelectItem key={admin.id} value={String(admin.id)}>
                  {admin.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover>           
            <PopoverTrigger render={
              <Button variant="outline" size="sm" className="w-40 justify-between font-normal">
                {dateFilter ? format(new Date(dateFilter), "dd.MM.yyyy") : <span className="text-muted-foreground">Выберите дату</span>}
                <CalendarIcon className="w-4 h-4 opacity-50" />
              </Button>          
            } />
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateFilter ? new Date(dateFilter) : undefined}
                onSelect={(d) => { setDateFilter(d ? format(d, "yyyy-MM-dd") : ""); setSearch(""); setPage(1); }}
              />
            </PopoverContent>
          </Popover>

          <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Поиск (ID, IP, action)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-8"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground z-10"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {hasFilters && (
              <Button variant="destructive" size="sm" onClick={handleResetFilters} className="shrink-0 gap-1.5">
                <FilterX className="w-4 h-4" /> Сбросить
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-md border border-border overflow-hidden bg-card relative">
        {isRefetching && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/40 backdrop-blur-[2px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-16">ID</TableHead>
              <TableHead className="w-32">Время</TableHead>
              <TableHead className="w-56">Кто действовал</TableHead>
              <TableHead className="w-48">Действие</TableHead>
              <TableHead className="w-64">Объект</TableHead>
              <TableHead>Изменения</TableHead>
              <TableHead className="w-32">IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
          {isFirstLoad ? (
              <TableRow>
                <TableCell colSpan={7} className="py-16">
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                </TableCell>
              </TableRow>
            ) : showEmpty ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="h-64 text-center text-muted-foreground animate-in fade-in duration-300">
                  <div className="flex flex-col items-center gap-3">
                    <ShieldCheck className="w-16 h-16 opacity-25" />
                    <p className="text-sm font-medium">Логи не найдены</p>
                    {hasFilters && (
                      <Button variant="outline" size="sm" onClick={handleResetFilters}>
                        Сбросить фильтры
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              items.map((log, index) => {
                const isHighlighted = log.id === isHighlightedId;
                const rowClassName = [
                  "border-b border-border transition-colors",
                  isHighlighted ? "bg-blue-50 dark:bg-blue-950/40 " : "",
                ].filter(Boolean).join(" ");

                const badgeColor = log.action.includes("ban") || log.action.includes("delete")
                  ? "bg-red-500/10 text-red-500"
                  : log.action.includes("approve") || log.action.includes("unban")
                  ? "bg-green-500/10 text-green-500"
                  : log.action.includes("update")
                  ? "bg-blue-500/10 text-blue-500"
                  : "bg-muted text-muted-foreground";

                return (
                  <TableRow
                    key={log.id}
                    ref={isHighlighted ? highlightRowRef : undefined}
                    className={`${rowClassName} animate-in fade-in slide-in-from-bottom-1 duration-300`}
                    style={{
                      animationDelay: `${Math.min(index * 20, 400)}ms`,
                      animationFillMode: "backwards",
                    }}
                  >
                    <TableCell className={`text-xs font-mono whitespace-nowrap tabular-nums ${isHighlighted ? "text-primary font-bold" : "text-muted-foreground"}`}>
                      #{log.id}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground/80">{formatDate(log.created_at)}</span>
                        <span>{formatTime(log.created_at)}</span>
                      </div>
                    </TableCell>
                   <TableCell>
                      {log.admin ? (
                        <button
                          onClick={() => router.push(`/admin/users/${log.admin!.id}`)}
                          className="block text-left"
                        >
                          <UserBadge user={log.admin!} />
                        </button>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Система</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${badgeColor}`}>
                        {log.action}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.is_system ? (
                        <span className="text-muted-foreground">ID не передан</span>
                      ) : log.is_deleted ? (
                        <div className="flex flex-col">
                          <span className="text-muted-foreground line-through">{log.object_type} #{log.object_id}</span>
                          <span className="text-[10px] text-destructive/80">объект удален</span>
                        </div>
                      ) : log.object_url ? (
                        <button
                          onClick={() => router.push(log.object_url!)}
                          className="text-primary hover:underline text-left"
                        >
                          {log.object_type} #{log.object_id}
                        </button>
                      ) : (
                        <span className="text-muted-foreground">{log.object_type} #{log.object_id}</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-100">
                      {log.before || log.after ? (
                       <details className="group">
                          <summary className="cursor-pointer text-sm hover:text-primary flex items-center gap-1 list-none">
                            <Code className="w-4 h-4 text-muted-foreground" />
                            Показать дифф
                            <ChevronDown className="shrink-0 w-4 h-4 inline group-open:rotate-180 transition-transform" />
                          </summary>
                          {/* ✅ Анимация через grid-rows: 0fr -> 1fr */}
                          <div className="grid grid-rows-[0fr] group-open:grid-rows-[1fr] transition-all duration-300 ease-in-out overflow-hidden">
                            <div className="min-h-0">
                              <div className="mt-2 p-3 bg-muted/30 rounded-lg overflow-x-auto space-y-2">
                                {log.before && (
                                  <div className="text-xs">
                                    <span className="text-red-500 font-bold">BEFORE:</span>
                                    <pre className="text-muted-foreground whitespace-pre-wrap font-mono mt-1">
                                      {JSON.stringify(log.before, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                {log.before && log.after && (
                                  <ArrowDown className="w-4 h-4 text-muted-foreground" />
                                )}
                                {log.after && (
                                  <div className="text-xs">
                                    <span className="text-green-500 font-bold">AFTER:</span>
                                    <pre className="text-muted-foreground whitespace-pre-wrap font-mono mt-1">
                                      {JSON.stringify(log.after, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </details>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Globe className="w-3 h-3" />
                        {log.ip_address}
                      </div>
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
    </div>
  );
}

