// app/(admin)/system/media/_components/media-library-page-client.tsx
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  useMediaLibraryList,
  useMediaCollectionCounts,
  useUploadMediaLibrary,
  useDeleteMediaLibrary,
  type MediaLibraryItem,
} from "@/hooks/admin/use-media-library";
import { extractErrorMessage } from "@/lib/api";
import { getInitialUrlParam } from "@/lib/url-params";
import {
  MEDIA_COLLECTION_LIST,
  getCollectionLabel,
  getThumbAspectRatio,
  getAcceptedMimeTypes,
  getCollectionConfig,
  getMaxFileSizeMb,
} from "@/config/media-collections";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  HoverCard, HoverCardContent, HoverCardTrigger,
} from "@/components/ui/hover-card";
import { toast } from "sonner";
import { PhotoProvider, PhotoView } from "react-photo-view";
import "react-photo-view/dist/react-photo-view.css";
import {
  ArrowLeft, Image as ImageIcon, Upload, Search, X, FilterX,
  Loader2, Trash2, Maximize2, Info, ImageOff, Link2, Scissors, AlertCircle,
} from "lucide-react";
import { SEARCH_DEBOUNCE_MS, PER_PAGE, type ContextMenuState } from "./_shared";
import { MediaCollectionButton } from "./media-collection-button";
import { MediaCropRulesView } from "./media-crop-rules";
import { MediaInfoModal } from "./media-info-modal";
import { ListPagination } from "@/components/admin/list-pagination";

export function MediaLibraryPageClient() {
  const router = useRouter();

  // F3: initial state через getInitialUrlParam (после mount).
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [collectionFilter, setCollectionFilter] = useState(MEDIA_COLLECTION_LIST[0].value);
  const [page, setPage] = useState(1);

  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    open: false, x: 0, y: 0, media: null,
  });
  const [viewingMediaId, setViewingMediaId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MediaLibraryItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const [urlInitialized, setUrlInitialized] = useState(false);

  // Initial URL read.
  useEffect(() => {
          // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearch(getInitialUrlParam("q"));
    setDebouncedSearch(getInitialUrlParam("q"));
    // Валидация: col должен быть из списка коллекций. Если "all" или
    // неизвестное значение — ставим первую коллекцию ("default").
    // Концепции "Все коллекции" не существует — у каждой свои пропорции.
    const urlCol = getInitialUrlParam("col");
    const validCol = urlCol && MEDIA_COLLECTION_LIST.some((c) => c.value === urlCol)
      ? urlCol
      : MEDIA_COLLECTION_LIST[0].value;
    setCollectionFilter(validCol);
    setPage(parseInt(getInitialUrlParam("page") || "1", 10));
    setUrlInitialized(true);
  }, []);

  // URL-sync.
  useEffect(() => {
    if (!urlInitialized) return;
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (collectionFilter) params.set("col", collectionFilter);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }, [search, collectionFilter, page, router, urlInitialized]);

  // F5: debounce 400ms.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search]);

  const { data: countsData } = useMediaCollectionCounts();
  const counts = countsData?.data;

  // UI при этом остаётся на конкретной коллекции — после нахождения медиа
  // таб автоматически переключится на реальную коллекцию найденного файла.
  // collectionFilter (UI state) никогда не становится "all" — этого значения
  // нет в MEDIA_COLLECTION_LIST.
  const isIdSearch = debouncedSearch !== "" && /^\d+$/.test(debouncedSearch);
  const queryCollection = isIdSearch ? "all" : collectionFilter;

  const { data, isLoading, isFetching, isError, error, refetch } = useMediaLibraryList({
    search: debouncedSearch,
    collection: queryCollection,
    page,
    per_page: PER_PAGE,
  });

  // Переключение вкладки при поиске по ID.
  // data.collection — реальная коллекция найденного медиа (бэкенд возвращает).
  // Валидируем: если это "all" или неизвестное значение — не переключаем
  // (оставляем текущую коллекцию).
  useEffect(() => {
    if (!data?.collection) return;
    if (!isIdSearch) return;
    if (data.collection === "all") return;
    if (!MEDIA_COLLECTION_LIST.some((c) => c.value === data.collection)) return;
    if (data.collection !== collectionFilter) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCollectionFilter(data.collection);
    }
  }, [data?.collection, collectionFilter, isIdSearch]);

  const uploadMutation = useUploadMediaLibrary();
  const deleteMutation = useDeleteMediaLibrary();

  const items: MediaLibraryItem[] = useMemo(() => data?.data ?? [], [data]);
  const meta = data?.meta;

  const isHighlightedId = isIdSearch ? parseInt(debouncedSearch, 10) : null;

  useEffect(() => {
    if (highlightRef.current && isHighlightedId) {
      highlightRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isHighlightedId, items]);

  // Close context menu on outside click / scroll / Escape.
  useEffect(() => {
    if (!contextMenu.open) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu((s) => ({ ...s, open: false }));
      }
    };
    const handleClose = () => setContextMenu((s) => ({ ...s, open: false }));
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("scroll", handleClose, true);
    window.addEventListener("resize", handleClose);
    const escHandler = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", escHandler);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("scroll", handleClose, true);
      window.removeEventListener("resize", handleClose);
      window.removeEventListener("keydown", escHandler);
    };
  }, [contextMenu.open]);

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const maxSizeKb = getCollectionConfig(collectionFilter).max_file_size_kb;
    const oversized = files.filter((f) => f.size > maxSizeKb * 1024);
    if (oversized.length > 0) {
      toast.error(
        `Файлы превышают макс. размер ${getMaxFileSizeMb(collectionFilter)} MB: ${oversized.map((f) => f.name).join(", ")}`
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    uploadMutation.mutate({ files, collection: collectionFilter });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleContextMenu = (e: React.MouseEvent, media: MediaLibraryItem) => {
    e.preventDefault();
    setContextMenu({ open: true, x: e.pageX, y: e.pageY, media });
  };

  const handleCopyUrl = async (url: string) => {
    try {
      const fullUrl = url.startsWith("http")
        ? url
        : `${window.location.origin}${url.startsWith("/") ? "" : "/"}${url}`;
      await navigator.clipboard.writeText(fullUrl);
      toast.success("URL скопирован");
    } catch {
      toast.error("Не удалось скопировать URL");
    }
    setContextMenu((s) => ({ ...s, open: false }));
  };

  const handleCollectionChange = (col: string) => {
    setCollectionFilter(col);
    setSearch("");
    setDebouncedSearch("");
    setPage(1);
  };

   const handleResetFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    // Сбрасываем коллекцию на "Общая" (первую в списке). Раньше при поиске
    // по ID collectionFilter подменялся на "all" для API-запроса, и при
    // сбросе это значение "all" оставалось в UI — показывались картинки
    // со всех коллекций. Теперь явно возвращаем на "default".
    setCollectionFilter(MEDIA_COLLECTION_LIST[0].value);
    setPage(1);
  };

  const hasFilters = search !== "";
  const showEmpty = !isLoading && !isFetching && items.length === 0 && !isError;
  const showLoadingState = (isLoading || isFetching) && items.length === 0;

  const aspect = getThumbAspectRatio(collectionFilter);
  const isWide = ["post", "notifications", "banner_desktop"].includes(collectionFilter);
  const gridCols = isWide
    ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
    : "grid-cols-2 sm:grid-cols-4 lg:grid-cols-6";

  return (
    <PhotoProvider
      maskOpacity={0.9}
      bannerVisible={false}
      overlayRender={({ onClose }) => (
        <button
          className="absolute top-4 right-4 z-60 text-white p-2 hover:bg-white/10 rounded-full transition-colors"
          onClick={onClose}
          title="Закрыть (Esc)"
        >
          <X className="w-7 h-7" />
        </button>
      )}
    >
      <div className="space-y-6 p-4 lg:p-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <ImageIcon className="w-6 h-6" />
              Медиа-хранилище
            </h1>
            <p className="text-sm text-muted-foreground">Управление загруженными изображениями</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 justify-between flex-wrap">
          <div className="flex flex-wrap gap-1.5">
            {MEDIA_COLLECTION_LIST.map((c) => {
              const count = counts?.[c.value] ?? 0;
              return (
                <MediaCollectionButton
                  key={c.value}
                  label={c.label}
                  count={count}
                  isActive={collectionFilter === c.value}
                  onClick={() => handleCollectionChange(c.value)}
                />
              );
            })}

            <HoverCard>
              <HoverCardTrigger render={
                <button
                  type="button"
                  className="text-xs text-blue-500 hover:underline flex items-center gap-1 cursor-pointer ml-2"
                >
                  <Scissors className="w-3.5 h-3.5" />
                  правила кропа
                </button>
              }/>
              <HoverCardContent className="w-80" align="start">
                <MediaCropRulesView
                  collection={collectionFilter}
                  label={getCollectionLabel(collectionFilter)}
                />
              </HoverCardContent>
            </HoverCard>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              disabled={!hasFilters}
              className="gap-1.5"
            >
              <FilterX className="w-4 h-4" />
              Сбросить
            </Button>

            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Поиск по имени или ID..."
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

            <Button
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMutation.isPending}
              className="gap-1.5"
            >
              {uploadMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              Загрузить
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              accept={getAcceptedMimeTypes()}
              onChange={handleFilesSelected}
            />
          </div>
        </div>

        {/* Grid */}
        <div className="relative">
          {showLoadingState ? (
            <div className="bg-card border border-border rounded-lg flex items-center justify-center text-sm text-muted-foreground min-h-100">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : isError ? (
            // F6: отдельная ветка ошибки загрузки.
            <div className="bg-card border border-border rounded-lg flex flex-col items-center justify-center text-center min-h-100 py-8">
              <AlertCircle className="w-12 h-12 text-destructive/50 mb-3" />
              <p className="text-sm font-medium text-destructive">Не удалось загрузить медиа</p>
              <p className="text-xs text-muted-foreground mt-1">
                {extractErrorMessage(error, "Проверьте соединение с сервером")}
              </p>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-4">
                <FilterX className="w-4 h-4 mr-2" />
                Повторить
              </Button>
            </div>
          ) : showEmpty ? (
            <div className="bg-card border border-border rounded-lg flex flex-col items-center justify-center text-center text-muted-foreground min-h-100 py-8">
              <ImageOff className="w-12 h-12 opacity-30 mb-3" />
              <p className="text-sm font-medium">Файлов не найдено</p>
              {hasFilters && (
                <Button variant="outline" size="sm" onClick={handleResetFilters} className="mt-4">
                  Сбросить фильтры
                </Button>
              )}
            </div>
          ) : (
            <div className={`grid ${gridCols} gap-4`}>
              {items.map((media) => {
                const isHighlighted = media.id === isHighlightedId;
                return (
                  <div
                    key={media.id}
                    ref={isHighlighted ? highlightRef : undefined}
                    onContextMenu={(e) => handleContextMenu(e, media)}
                    className={`relative group rounded-lg overflow-hidden border bg-muted/10 cursor-pointer transition-all ${
                      isHighlighted
                        ? "ring-4 ring-blue-500 border-blue-500 scale-[1.02] shadow-lg shadow-blue-500/30 z-10"
                        : "border-border hover:border-primary/30"
                    }`}
                    style={{ aspectRatio: aspect.css }}
                  >
                    <PhotoView src={media.lg_url}>
                      <div className="absolute inset-0 w-full h-full">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={media.thumb_url || media.url}
                          alt={media.file_name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    </PhotoView>

                    {media.is_processing && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      </div>
                    )}

                    <div className="absolute top-1 right-1 z-20 pointer-events-none">
                      <span className="bg-black/70 text-white text-[10px] font-mono font-bold px-1.5 py-0.5 rounded">
                        #{media.id}
                      </span>
                    </div>

                    {isHighlighted && (
                      <div className="absolute top-2 left-2 z-30 pointer-events-none">
                        <span className="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded shadow-lg flex items-center gap-1">
                          <Search className="w-3 h-3" />
                          Найдено
                        </span>
                      </div>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setDeleteTarget(media);
                      }}
                      onContextMenu={(e) => e.stopPropagation()}
                      className="absolute bottom-2 right-2 z-40 opacity-0 group-hover:opacity-100 transition-opacity bg-destructive text-white px-2 py-1.5 rounded-md hover:bg-destructive/90 flex items-center gap-1 shadow-lg text-xs font-medium"
                      title="Удалить файл"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Удалить
                    </button>
                  </div>
                );
              })}
            </div>
          )}
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

        {/* Context Menu */}
        {contextMenu.open && contextMenu.media && (
          <div
            ref={menuRef}
            className="fixed z-100 min-w-50 bg-card border border-border rounded-md shadow-xl py-1"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              type="button"
              onClick={() => {
                window.open(contextMenu.media!.lg_url, "_blank");
                setContextMenu((s) => ({ ...s, open: false }));
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left"
            >
              <Maximize2 className="w-4 h-4" /> Открыть
            </button>
            <button
              type="button"
              onClick={() => {
                setViewingMediaId(contextMenu.media!.id);
                setContextMenu((s) => ({ ...s, open: false }));
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left"
            >
              <Info className="w-4 h-4" /> Данные
            </button>
            <div className="h-px bg-border my-1" />
            <button
              type="button"
              onClick={() => contextMenu.media && handleCopyUrl(contextMenu.media.url)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left"
            >
              <Link2 className="w-4 h-4" /> Копировать URL
            </button>
            <div className="h-px bg-border my-1" />
            <button
              type="button"
              onClick={() => {
                setDeleteTarget(contextMenu.media);
                setContextMenu((s) => ({ ...s, open: false }));
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 text-left"
            >
              <Trash2 className="w-4 h-4" /> Удалить
            </button>
          </div>
        )}

        {/* Info Modal */}
        <MediaInfoModal
          mediaId={viewingMediaId}
          onClose={() => setViewingMediaId(null)}
          onCopyUrl={handleCopyUrl}
        />

        {/* Delete Confirm */}
        <ConfirmDialog
          open={deleteTarget !== null}
          onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
          title="Удалить файл?"
          description={
            deleteTarget
              ? `Файл «${deleteTarget.file_name}» будет удален навсегда вместе со всеми вариантами.`
              : undefined
          }
          confirmText="Удалить"
          cancelText="Отмена"
          variant="destructive"
          isLoading={deleteMutation.isPending}
          onConfirm={() => {
            if (deleteTarget) {
              deleteMutation.mutate(deleteTarget.id, {
                onSuccess: () => setDeleteTarget(null),
              });
            }
          }}
        />
      </div>
    </PhotoProvider>
  );
}

