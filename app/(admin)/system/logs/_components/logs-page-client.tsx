// app/(admin)/system/logs/_components/logs-page-client.tsx
"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Loader2, AlertCircle } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination";
import { ArrowLeft, FileText, RefreshCw, Trash2, Search, X, CalendarIcon } from "lucide-react";
import { logsApi, type LogEntry, type LogsApiResponse } from "@/lib/api/logs";
import { extractErrorMessage } from "@/lib/api";
import { getInitialUrlParam } from "@/lib/url-params";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants";


const LOG_LEVELS = ['DEBUG', 'INFO', 'NOTICE', 'WARNING', 'ERROR', 'CRITICAL', 'ALERT', 'EMERGENCY'];

// Цвета для уровней логов
const LEVEL_STYLES: Record<string, string> = {
  'DEBUG': 'text-gray-500 bg-gray-500/10',
  'INFO': 'text-blue-500 bg-blue-500/10',
  'NOTICE': 'text-purple-500 bg-purple-500/10',
  'WARNING': 'text-yellow-500 bg-yellow-500/10',
  'ERROR': 'text-red-500 bg-red-500/10',
  'CRITICAL': 'text-red-700 bg-red-700/10',
  'ALERT': 'text-orange-500 bg-orange-500/10',
  'EMERGENCY': 'text-red-900 bg-red-900/10',
};

export function LogsPageClient() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [level, setLevel] = useState('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [date, setDate] = useState<Date | undefined>();
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  const [urlInitialized, setUrlInitialized] = useState(false);

  // F5: URL-sync.
  useEffect(() => {
    const urlLevel = getInitialUrlParam("level");
     // eslint-disable-next-line react-hooks/set-state-in-effect
    if (urlLevel && LOG_LEVELS.includes(urlLevel)) setLevel(urlLevel);
    setSearch(getInitialUrlParam("q"));
    setDebouncedSearch(getInitialUrlParam("q"));
    const urlPage = parseInt(getInitialUrlParam("page") || "1", 10);
    if (!isNaN(urlPage) && urlPage > 0) setPage(urlPage);
    setUrlInitialized(true);
  }, []);

  const dateString = date ? format(date, "yyyy-MM-dd") : "";

  useEffect(() => {
    if (!urlInitialized) return;
    const params = new URLSearchParams();
    if (level !== 'all') params.set("level", level);
    if (search) params.set("q", search);
    if (dateString) params.set("date", dateString);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [level, search, page, dateString, urlInitialized]);

  // F3: debounce 400ms.
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handler);
  }, [search]);

  // F2: placeholderData вместо deprecated keepPreviousData.
  const queryResult = useQuery({
    queryKey: ['logs', page, level, debouncedSearch, dateString],
    queryFn: () => logsApi.get({ page, level, search: debouncedSearch, date: dateString }),
    placeholderData: (prev) => prev,
  });

  const data: LogsApiResponse | undefined = queryResult.data;
  const isLoading = queryResult.isLoading;
  const isFetching = queryResult.isFetching;
  const isError = queryResult.isError;
  const error = queryResult.error;

  const clearMutation = useMutation({
    mutationFn: () => logsApi.clear(),
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ['logs'] });
      setIsAlertOpen(false);
    },
    // F6: extractErrorMessage.
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Ошибка при очистке логов")),
  });

  const handleClearFilters = () => {
    setLevel('all');
    setSearch('');
    setDebouncedSearch('');
    setDate(undefined);
    setPage(1);
  };

  const hasFilters = level !== 'all' || search !== '' || date !== undefined;

  const lastPage = data?.logs.last_page || 1;
  const currentPage = data?.logs.current_page || 1;

  // F1: убрали console.log.
  const isFirstLoad = isLoading && !data?.logs;
  const isRefetching = isFetching && !isFirstLoad;
  const showEmpty = !isLoading && !isFetching && (!data?.logs?.data || data.logs.data.length === 0) && !isError;

  const renderPaginationItems = () => {
    const items = [];
    const maxPagesToShow = 5;

    if (lastPage <= 1) return null;

    items.push(
      <PaginationItem key="prev">
        <PaginationPrevious 
          href="#" 
          onClick={(e) => { e.preventDefault(); setPage(p => Math.max(p - 1, 1)); }} 
          aria-disabled={currentPage === 1}
          className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
        />
      </PaginationItem>
    );

    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    const endPage = Math.min(lastPage, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    if (startPage > 1) {
      items.push(
        <PaginationItem key="1">
          <PaginationLink href="#" onClick={(e) => { e.preventDefault(); setPage(1); }}>1</PaginationLink>
        </PaginationItem>
      );
      if (startPage > 2) {
        items.push(<PaginationEllipsis key="ellipsis-start" />);
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink 
            href="#" 
            onClick={(e) => { e.preventDefault(); setPage(i); }}
            isActive={i === currentPage}
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }

    if (endPage < lastPage) {
      if (endPage < lastPage - 1) {
        items.push(<PaginationEllipsis key="ellipsis-end" />);
      }
      items.push(
        <PaginationItem key={lastPage}>
          <PaginationLink href="#" onClick={(e) => { e.preventDefault(); setPage(lastPage); }}>{lastPage}</PaginationLink>
        </PaginationItem>
      );
    }

    items.push(
      <PaginationItem key="next">
        <PaginationNext 
          href="#" 
          onClick={(e) => { e.preventDefault(); setPage(p => Math.min(p + 1, lastPage)); }} 
          aria-disabled={currentPage === lastPage}
          className={currentPage === lastPage ? "pointer-events-none opacity-50" : ""}
        />
      </PaginationItem>
    );

    return items;
  };

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <FileText className="w-6 h-6" />
              Системные логи
            </h1>
            <p className="text-sm text-muted-foreground">
              Размер файла: {data?.log_size || '0 B'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['logs'] })}
            disabled={isFetching}
          >
            {isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </Button>

          <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
            <AlertDialogTrigger render={
              <Button variant="destructive" size="sm">
                <Trash2 className="w-4 h-4 mr-1" />
                Очистить логи
              </Button>
            }/>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Очистка системных логов</AlertDialogTitle>
                <AlertDialogDescription>
                  Вы уверены? Все логи будут удалены безвозвратно. Это действие нельзя отменить.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Отмена</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => clearMutation.mutate()}
                  disabled={clearMutation.isPending}
                  className="bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40"
                >
                  {clearMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Очищаем...
                    </>
                  ) : (
                    "Очистить"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Фильтры */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={level === 'all' ? 'default' : 'secondary'}
          size="sm"
          onClick={() => { setLevel('all'); setPage(1); }}
          className="flex items-center gap-1.5"
        >
          Все
          <Badge className={`text-xs ${level === 'all' ? 'bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/20' : 'bg-background/60 text-foreground hover:bg-background/60'}`}>
            {data?.stats.total_entries || 0}
          </Badge>
        </Button>

        {LOG_LEVELS.map((lvl) => {
          const count = data?.stats.levels[lvl] || 0;
          if (count === 0) return null;
          
          const style = LEVEL_STYLES[lvl] || '';
          const isActive = level === lvl;
          
          return (
            <Button
              key={lvl}
              variant={isActive ? 'default' : 'secondary'}
              size="sm"
              onClick={() => { setLevel(lvl); setPage(1); }}
              className={`flex items-center gap-1.5 ${!isActive ? style : ''}`}
            >
              {lvl}
              <Badge className={`text-xs ${isActive ? 'bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/20' : 'bg-background/60 text-foreground hover:bg-background/60'}`}>
                {count}
              </Badge>
            </Button>
          );
        })}

        <div className="flex items-center gap-2 ml-auto">
          {hasFilters && (
            <Button variant="outline" size="sm" onClick={handleClearFilters} className="text-muted-foreground">
              <X className="w-4 h-4 mr-1" /> Сбросить
            </Button>
          )}

          <Popover>
            <PopoverTrigger render={
              <Button variant="outline" size="sm" className="w-53 justify-between font-normal">
                {date ? format(date, "PPP") : <span className="text-muted-foreground">Выберите дату</span>}
                <CalendarIcon className="w-4 h-4 opacity-50" />
              </Button>
            } />
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => { setDate(d); setPage(1); }}
                defaultMonth={date}
              />
            </PopoverContent>
          </Popover>

          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Поиск по тексту..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 pr-8"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Таблица с логами */}
      <div className="bg-card border border-border rounded-lg overflow-hidden relative">
        {isRefetching && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/40 backdrop-blur-[2px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        <div className="overflow-x-auto">
          <Table className="table-fixed w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="w-40">Время</TableHead>
                <TableHead className="w-28">Уровень</TableHead>
                <TableHead className="w-[calc(100%-10.5rem)]">Сообщение</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isFirstLoad ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-16">
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : isError ? (
                // F4: отдельная ветка ошибки загрузки.
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={3} className="h-64 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <AlertCircle className="w-16 h-16 text-destructive/50" />
                      <div>
                        <p className="text-sm font-medium text-destructive">Не удалось загрузить логи</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {extractErrorMessage(error, "Проверьте соединение с сервером")}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => queryResult.refetch()} className="mt-2">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Повторить
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : showEmpty ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={3} className="py-12 text-center text-muted-foreground animate-in fade-in duration-300">
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="w-12 h-12 opacity-30" />
                      <p>Логи не найдены</p>
                      {hasFilters && (
                        <Button variant="outline" size="sm" onClick={handleClearFilters}>
                          Сбросить фильтры
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data?.logs?.data?.map((log: LogEntry, index: number) => {
                  const levelStyle = LEVEL_STYLES[log.level] || 'bg-muted text-muted-foreground';
                  
                  return (
                    <TableRow 
                      key={index}
                      className="animate-in fade-in slide-in-from-bottom-1 duration-300"
                      style={{
                        animationDelay: `${Math.min(index * 20, 400)}ms`,
                        animationFillMode: 'backwards',
                      }}
                    >
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap align-top py-3 tabular-nums">
                        {log.timestamp}
                      </TableCell>
                      <TableCell className="align-top py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${levelStyle}`}>
                          {log.level}
                        </span>
                      </TableCell>
                      <TableCell className="align-top py-3">
                        <Accordion>
                          <AccordionItem value={`item-${index}`} className="border-0">
                            <AccordionTrigger className="hover:no-underline py-0 text-left w-full">
                              <span className="truncate text-sm flex-1 min-w-0 text-left pr-2">
                                {log.message}
                              </span>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2 pb-0">
                              <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-all font-mono overflow-x-auto p-2 bg-muted/30 rounded">
                                {log.full}
                              </pre>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Пагинация */}
      {data?.logs && (
        <div className="flex flex-col items-center gap-4">
          <div className="text-xs text-muted-foreground tabular-nums">
            Показано {data.logs.data.length} из {data.logs.total} записей
            {debouncedSearch && <span className="ml-2">(фильтр: &quot;{debouncedSearch}&quot;)</span>}
            {level !== 'all' && <span className="ml-2">(уровень: {level})</span>}
          </div>
          
          {lastPage > 1 && (
            <Pagination>
              <PaginationContent>
                {renderPaginationItems()}
              </PaginationContent>
            </Pagination>
          )}
        </div>
      )}
    </div>
  );
}