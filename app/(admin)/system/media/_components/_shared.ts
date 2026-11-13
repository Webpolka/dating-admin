// app/(admin)/system/media/_components/_shared.ts

export { SEARCH_DEBOUNCE_MS } from "@/lib/constants";
export const PER_PAGE = 24;

export interface ContextMenuState {
  open: boolean;
  x: number;
  y: number;
  media: import("@/hooks/admin/use-media-library").MediaLibraryItem | null;
}