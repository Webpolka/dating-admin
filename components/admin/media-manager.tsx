"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  useMediaList,
  useUploadMedia,
  useDeleteMedia,
  type MediaItem,
} from "@/hooks/admin/use-media";
import {
  MEDIA_COLLECTION_LIST,
  getCollectionConfig,
  getCollectionLabel,
  getDisplayAspectRatio,
  getMaxFileSizeMb,
  getAcceptedMimeTypes,
} from "@/config/media-collections";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Search,
  X,
  Upload,
  Image as ImageIcon,
  Loader2,
  Check,
  Link2,
  Trash2,
  Scissors,
  ImageOff,
} from "lucide-react";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants";

interface MediaManagerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (media: MediaItem) => void;
  collection?: string;
  title?: string;
}

interface ContextMenuState {
  open: boolean;
  x: number;
  y: number;
  media: MediaItem | null;
}


export function MediaManager({
  open,
  onClose,
  onSelect,
  collection = "default",
  title = "Медиа хранилище",
}: MediaManagerProps) {
  const isCollectionForced = collection !== "default";
  const [activeCollection, setActiveCollection] = useState<string>(collection);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    open: false,
    x: 0,
    y: 0,
    media: null,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Sync при открытии
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveCollection(collection);
      setSearch("");
      setDebouncedSearch("");
      setPage(1);
      setSelectedId(null);
    }
  }, [open, collection]);

  // ✅ Debounce search — 1 секунда
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
      // ✅ НЕ сбрасываем selectedId — пользователь мог выбрать до поиска
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isFetching } = useMediaList(
    {
      collection: activeCollection,
      search: debouncedSearch,
      page,
      per_page: 24,
    },
    open
  );

  const uploadMutation = useUploadMedia();
  const deleteMutation = useDeleteMedia();

  // ✅ Вычисляем ID для подсветки (если поиск по ID)
  const highlightedId = debouncedSearch !== "" && /^\d+$/.test(debouncedSearch)
    ? parseInt(debouncedSearch, 10)
    : null;

  // Close context menu
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
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") handleClose();
    });
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("scroll", handleClose, true);
      window.removeEventListener("resize", handleClose);
    };
  }, [contextMenu.open]);

  const handleFilesSelected = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length === 0) return;

      const maxSizeKb = getCollectionConfig(activeCollection).max_file_size_kb;
      const oversized = files.filter((f) => f.size > maxSizeKb * 1024);
      if (oversized.length > 0) {
        toast.error(
          `Файлы превышают макс. размер ${getMaxFileSizeMb(activeCollection)} MB: ${oversized.map((f) => f.name).join(", ")}`
        );
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      uploadMutation.mutate({ files, collection: activeCollection });
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [uploadMutation, activeCollection]
  );

  const handleSelectMedia = (media: MediaItem) => {
    if (media.is_processing) {
      toast.error("Файл еще обрабатывается. Дождитесь окончания нарезки.");
      return;
    }
    setSelectedId((prev) => (prev === media.id ? null : media.id));
  };

  const handleConfirmSelection = () => {
    if (selectedId === null) return;
    const media = data?.data.find((m) => m.id === selectedId);
    if (!media) return;
    if (media.is_processing) {
      toast.error("Файл еще обрабатывается.");
      setSelectedId(null);
      return;
    }
    onSelect(media);
    onClose();
  };

  const handleContextMenu = (e: React.MouseEvent, media: MediaItem) => {
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

  const handleDelete = (media: MediaItem) => {
    deleteMutation.mutate(media.id);
    setContextMenu((s) => ({ ...s, open: false }));
    if (selectedId === media.id) setSelectedId(null);
  };

  // ✅ Aspect ratio из LG варианта (как на странице)
  const aspect = getDisplayAspectRatio(activeCollection);

  // Grid columns
  const isWideCollection = ["post", "notifications", "banner_desktop"].includes(activeCollection);
  const gridCols = isWideCollection
    ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
    : "grid-cols-2 sm:grid-cols-4 lg:grid-cols-6";

  const items = data?.data ?? [];
  const hasProcessing = items.some((m) => m.is_processing);
  const meta = data?.meta;

  // ✅ Показываем скелетоны только при первой загрузке (когда нет данных)
  const showSkeletons = isLoading && items.length === 0;
  // ✅ Показываем empty state только когда реально нет данных (не во время рефетча)
  const showEmpty = !isLoading && !isFetching && items.length === 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="!max-w-[95vw] !w-[95vw] lg:!max-w-[1400px] !h-[90vh] !max-h-[90vh] p-0 overflow-hidden flex flex-col gap-0">
        {/* Header */}
        <DialogHeader className="px-5 py-4 border-b border-border flex-row items-center justify-between space-y-0 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <ImageIcon className="w-5 h-5" />
            {title}
            <span className="text-muted-foreground font-normal text-sm">
              ({isCollectionForced ? getCollectionLabel(activeCollection) : "выберите коллекцию"})
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Toolbar */}
        <div className="p-4 border-b border-border flex items-center gap-3 flex-wrap shrink-0">
          <div className="flex items-center gap-2">
            {!isCollectionForced ? (
              <Select
                value={activeCollection}
                onValueChange={(v: string | null) => {
                  if (v) {
                    setActiveCollection(v);
                    setPage(1);
                    setSelectedId(null);
                    if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
                  }
                }}
              >
                <SelectTrigger className="w-45">
                  {getCollectionLabel(activeCollection)}
                </SelectTrigger>
                <SelectContent>
                  {MEDIA_COLLECTION_LIST.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="text-xs text-muted-foreground px-2 py-1 rounded bg-muted border border-border">
                Коллекция: {getCollectionLabel(activeCollection)}
              </span>
            )}

            <HoverCard>
              <HoverCardTrigger render={
                <button
                  type="button"
                  className="text-xs text-blue-500 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Scissors className="w-3.5 h-3.5" />
                  правила кропа
                </button>
              }/>
              <HoverCardContent className="w-80" align="start">
                <CropRulesView
                  collection={activeCollection}
                  label={getCollectionLabel(activeCollection)}
                />
              </HoverCardContent>
            </HoverCard>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Поиск по названию или id..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-8"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <Button type="button" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-4 h-4" />
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

          {uploadMutation.isPending && (
            <div className="text-xs text-primary flex items-center gap-2 w-full">
              <Loader2 className="w-3 h-3 animate-spin" />
              Загрузка и оптимизация файлов...
            </div>
          )}
        </div>

        {/* Grid (скроллится) */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-4 min-h-0 bg-muted/10"
        >
          {showSkeletons ? (
            // ✅ Скелетоны только при первой загрузке — с правильными пропорциями
            <div className={`grid ${gridCols} gap-3`}>
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="rounded-sm"
                  style={{ aspectRatio: aspect.css }}
                />
              ))}
            </div>
          ) : showEmpty ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground animate-in fade-in duration-300">
              <ImageOff className="w-16 h-16 opacity-30 mb-3" />
              <p className="text-sm font-medium">Медиа-хранилище пусто</p>
              <p className="text-xs mt-1">Загрузите первый файл!</p>
            </div>
          ) : (
            <div className={`grid ${gridCols} gap-3`}>
              {items.map((media) => {
                const isSelected = selectedId === media.id;
                const isHighlighted = highlightedId !== null && media.id === highlightedId;

                return (
                  <div
                    key={media.id}
                    onClick={() => handleSelectMedia(media)}
                    onContextMenu={(e) => handleContextMenu(e, media)}
                    className={`relative group rounded-sm overflow-hidden transition-all cursor-pointer bg-background border-2 ${
                      media.is_processing
                        ? "opacity-50 cursor-wait border-border"
                        : isSelected
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-card border-primary"
                        : isHighlighted
                        ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-card border-blue-500"
                        : "border-border hover:border-primary/50"
                    }`}
                    style={{ aspectRatio: aspect.css }}
                    title={media.is_processing ? "Идет обработка..." : `Выбрать: ${media.file_name}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={media.thumb_url || media.url}
                      alt={media.file_name}
                      className={`w-full h-full object-cover ${
                        isSelected ? "opacity-90" : "group-hover:scale-105 transition-transform"
                      }`}
                    />

                    {media.is_processing && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      </div>
                    )}

                    <div className="absolute top-1 left-1 bg-black/60 text-white text-[10px] font-mono font-bold px-1.5 py-0.5 rounded backdrop-blur-sm">
                      #{media.id}
                    </div>

                    {!media.is_processing && isSelected && (
                      <div className="absolute inset-0 flex items-center justify-center bg-primary/20 pointer-events-none">
                        <div className="bg-primary text-primary-foreground rounded-full p-1.5">
                          <Check className="w-5 h-5" />
                        </div>
                      </div>
                    )}

                    {/* ✅ Бейдж "найдено" для подсвеченной картинки */}
                    {isHighlighted && !isSelected && !media.is_processing && (
                      <div className="absolute top-1 right-1 bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded backdrop-blur-sm">
                        найдено
                      </div>
                    )}

                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[10px] px-1 py-0.5 truncate opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      {media.file_name}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {hasProcessing && !showSkeletons && (
            <div className="text-xs text-muted-foreground mt-4 flex items-center gap-2 justify-center">
              <Loader2 className="w-3 h-3 animate-spin" />
              Некоторые файлы еще обрабатываются...
            </div>
          )}
        </div>

        {/* Pagination */}
        {meta && meta.last_page > 1 && (
          <div className="p-3 border-t border-border bg-card flex items-center justify-between gap-2 shrink-0">
            <div className="text-xs text-muted-foreground tabular-nums">
              {meta.from ?? 0} - {meta.to ?? 0} из {meta.total}
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1 || isFetching}
                onClick={() => {
                  setPage((p) => Math.max(1, p - 1));
                  if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
                }}
              >
                Назад
              </Button>
              <span className="text-xs text-muted-foreground px-2 tabular-nums">
                {page} / {meta.last_page}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= meta.last_page || isFetching}
                onClick={() => {
                  setPage((p) => Math.min(meta.last_page, p + 1));
                  if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
                }}
              >
                Вперёд
              </Button>
            </div>
          </div>
        )}

        {/* ✅ Footer — правильно отцентрованные кнопки с отступами */}
        <DialogFooter className="mx-0 mb-0 border-t border-border bg-muted/20 shrink-0 justify-end items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Отмена
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={selectedId === null}
            onClick={handleConfirmSelection}
          >
            <Check className="w-4 h-4 mr-1" />
            Выбрать
          </Button>
        </DialogFooter>
      </DialogContent>

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
              if (contextMenu.media) handleSelectMedia(contextMenu.media);
              setContextMenu((s) => ({ ...s, open: false }));
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left"
          >
            <Check className="w-4 h-4" /> Выбрать
          </button>
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
            onClick={() => contextMenu.media && handleDelete(contextMenu.media)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 text-left"
          >
            <Trash2 className="w-4 h-4" /> Удалить
          </button>
        </div>
      )}
    </Dialog>
  );
}

// ============================================
// CropRulesView — берёт данные из JS-конфига
// ============================================
function CropRulesView({ collection, label }: { collection: string; label: string }) {
  const config = getCollectionConfig(collection);
  const maxSizeMb = getMaxFileSizeMb(collection);

  return (
    <div className="space-y-2 p-2">
      <h4 className="text-sm font-semibold">Правила для «{label}»</h4>
      <div className="text-xs text-muted-foreground space-y-1">
        <div className="flex justify-between">
          <span>Макс. размер:</span>
          <span className="font-medium text-foreground">{maxSizeMb} MB</span>
        </div>
        <div className="flex justify-between">
          <span>Альфа-канал:</span>
          <span className="font-medium text-foreground">{config.alpha ? "Да" : "Нет"}</span>
        </div>
        <div className="flex justify-between">
          <span>Оригинал:</span>
          <span className="font-medium text-foreground">{config.keep_original ? "Да" : "Нет"}</span>
        </div>
        <div className="pt-2 mt-2 border-t border-border">
          <p className="font-medium text-foreground mb-1">Варианты нарезки:</p>
          <ul className="space-y-1">
            {Object.entries(config.variants).map(([key, v]) => (
              <li key={key} className="flex justify-between gap-2">
                <span className="font-mono text-[10px] bg-muted px-1 rounded">{key}</span>
                <span>
                  {v.size} ({v.fit}, {v.format} {v.quality}%)
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}