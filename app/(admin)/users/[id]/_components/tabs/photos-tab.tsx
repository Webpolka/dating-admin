"use client";

// app/(admin)/users/[id]/_components/tabs/photos-tab.tsx
//
// Таб «Фото» на странице пользователя: фото, сгруппированные по альбомам.
//
// Зеркало того, что обсуждали: один альбом = одна карточка. БЕЗ модерации —
// статусы/reject_reason/trashed/масс-действия убраны (модерация живёт в
// глобальной очереди /moderation/photos). Здесь только просмотр.
//
// Бэк: GET /admin/users/{userId}/photos (UserListingsController::photos) →
// composite {albums: UserPhotoAlbumItem[], counts: UserPhotoAlbumCounts}.
// Без пагинации (альбомов немного — все разом), фото внутри альбома —
// целиком (is_primary DESC, position ASC).
//
// Фото без album_id — бэк группирует в виртуальный «Без альбома» (id=null,
// последняя карточка).
//
// Галерея: react-photo-view (PhotoProvider на каждый альбом — лайтбокс
// листает фото внутри альбома, PhotoView src=large_url).

import { PhotoProvider, PhotoView } from "react-photo-view";
import "react-photo-view/dist/react-photo-view.css";

import { Badge } from "@/components/ui/badge";
import { TabError, TabLoading } from "@/components/admin/tab-states";
import { useUserPhotos } from "@/hooks/admin/use-users";
import type {
  AlbumPhotoItem,
  UserPhotoAlbumItem,
} from "@/lib/api/users";

import {
  Folder,
  ImageIcon,
  Lock,
  Star,
  Trash2,
} from "lucide-react";

interface PhotosTabProps {
  userId: number;
}

export function PhotosTab({ userId }: PhotosTabProps) {
  // params = {} — бэк не использует page/per_page (отдаёт все альбомы разом).
  // Передаём стабильно через {} (useUserListing сравнивает params в queryKey).
  const { data, isLoading, isError, refetch } = useUserPhotos(userId, {});

  if (isLoading || !data) return <TabLoading label="Загрузка фото..." />;
  if (isError) return <TabError label="Не удалось загрузить фото" onRetry={refetch} />;

  const { albums, counts } = data;

  if (albums.length === 0 || counts.photos_total === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-16 text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
          <ImageIcon className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium">Нет фото</h3>
        <p className="text-muted-foreground mt-1">
          У пользователя пока нет загруженных фото.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* === Шапка: общие счётчики === */}
      <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
        <Badge variant="secondary">{counts.albums} альб.</Badge>
        <Badge variant="secondary">{counts.photos_total} фото</Badge>
        {counts.photos_primary > 0 && (
          <Badge variant="secondary" className="gap-1">
            <Star className="w-3 h-3" /> {counts.photos_primary}
          </Badge>
        )}
        {counts.photos_intimate > 0 && (
          <Badge variant="secondary" className="gap-1">
            <Lock className="w-3 h-3" /> {counts.photos_intimate}
          </Badge>
        )}
      </div>

      {/* === Альбомы: одна карточка = один альбом === */}
      <div className="space-y-6">
        {albums.map((album) => (
          <AlbumCard key={albumKey(album)} album={album} />
        ))}
      </div>
    </div>
  );
}

/** Стабильный wire:key для альбома (id или 'orphan' для виртуального). */
function albumKey(album: UserPhotoAlbumItem): string {
  return album.id === null ? `album-orphan` : `album-${album.id}`;
}

// ============================================
// КАРТОЧКА АЛЬБОМА (шапка + сетка фото + лайтбокс)
// ============================================

function AlbumCard({ album }: { album: UserPhotoAlbumItem }) {
  const photos = album.photos;
  const isOrphan = album.id === null;

  return (
    <section className="bg-card border border-border rounded-lg overflow-hidden">
      {/* === Шапка альбома === */}
      <header className="flex items-center justify-between gap-3 flex-wrap px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2 min-w-0">
          {isOrphan ? (
            <ImageIcon className="w-4 h-4 text-muted-foreground shrink-0" />
          ) : (
            <Folder className="w-4 h-4 text-muted-foreground shrink-0" />
          )}
          <h3 className="text-sm font-medium truncate">{album.name}</h3>

          {/* Бейджи свойств альбома */}
          <div className="flex items-center gap-1 shrink-0">
            {album.is_default && (
              <Badge variant="secondary" className="text-[10px] gap-1 px-1.5">
                <Star className="w-2.5 h-2.5" /> основной
              </Badge>
            )}
            {album.is_private && (
              <Badge variant="secondary" className="text-[10px] gap-1 px-1.5">
                <Lock className="w-2.5 h-2.5" /> приватный
              </Badge>
            )}
            {album.deleted_at && (
              <Badge variant="destructive" className="text-[10px] gap-1 px-1.5">
                <Trash2 className="w-2.5 h-2.5" /> удалён
              </Badge>
            )}
          </div>
        </div>

        {/* Счётчик фото в альбоме */}
        <span className="text-xs text-muted-foreground shrink-0">
          {photos.length} фото
        </span>
      </header>

      {/* === Сетка фото === */}
      {photos.length === 0 ? (
        <div className="px-4 py-8 text-center text-xs text-muted-foreground">
          Альбом пуст.
        </div>
      ) : (
        <PhotoProvider>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1 p-2">
            {photos.map((photo) => (
              <PhotoThumb key={photo.id} photo={photo} />
            ))}
          </div>
        </PhotoProvider>
      )}
    </section>
  );
}

// ============================================
// ПРЕВЬЮ ФОТО (кликабельное — открывает лайтбокс)
// ============================================

function PhotoThumb({ photo }: { photo: AlbumPhotoItem }) {
  return (
    <PhotoView src={photo.large_url || photo.original_url}>
      {/* eslint-disable-next-line jsx-a11y/img-redundant-alt */}
      <figure className="group relative aspect-square overflow-hidden rounded-md bg-muted cursor-zoom-in">
        <img
          src={photo.thumb_url || photo.medium_url}
          alt={photo.title ?? `Фото ${photo.id}`}
          className="w-full h-full object-cover transition-transform group-hover:scale-105"
          loading="lazy"
        />

        {/* Бейдж аватара (is_primary) — правый верхний угол */}
        {photo.is_primary && (
          <span
            className="absolute top-1 right-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white shadow"
            title="Аватар профиля"
          >
            <Star className="w-3 h-3 fill-current" />
          </span>
        )}

        {/* Бейдж интимного фото — левый верхний угол */}
        {photo.is_intimate && (
          <span
            className="absolute top-1 left-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-500/90 text-white shadow"
            title="Интимное фото"
          >
            <Lock className="w-3 h-3" />
          </span>
        )}

        {/* Заголовок фото (если есть) — внизу при наведении */}
        {photo.title && (
          <figcaption className="absolute inset-x-0 bottom-0 px-2 py-1 bg-gradient-to-t from-black/70 to-transparent text-white text-[10px] truncate opacity-0 group-hover:opacity-100 transition-opacity">
            {photo.title}
          </figcaption>
        )}
      </figure>
    </PhotoView>
  );
}
