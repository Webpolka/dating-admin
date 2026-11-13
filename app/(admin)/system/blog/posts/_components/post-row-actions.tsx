// app/(admin)/system/blog/posts/_components/post-row-actions.tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator, DropdownMenuGroup, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal, Pencil, Copy, Send, FileEdit,
  Archive, ArrowUpFromLine, Trash2, Pin, PinOff,
} from "lucide-react";
import type { BlogPostList } from "@/hooks/admin/use-blog-posts";

interface Props {
  post: BlogPostList;
  onEdit: () => void;
  onDuplicate: () => void;
  onToggleFeatured: () => void;
  onToggleStatus: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onDelete: () => void;
}

/**
 * Dropdown-меню действий в строке таблицы постов.
 * Вынесено в отдельный компонент — раньше было inline в таблице.
 */
export function PostRowActions({
  post,
  onEdit,
  onDuplicate,
  onToggleFeatured,
  onToggleStatus,
  onArchive,
  onRestore,
  onDelete,
}: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
        <MoreHorizontal className="w-4 h-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-42">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Действия</DropdownMenuLabel>
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="w-4 h-4" /> Редактировать
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDuplicate}>
            <Copy className="w-4 h-4" /> Дублировать
          </DropdownMenuItem>

          <DropdownMenuItem onClick={onToggleFeatured}>
            {post.is_featured ? (
              <>
                <PinOff className="w-4 h-4" /> Открепить
              </>
            ) : (
              <>
                <Pin className="w-4 h-4" /> Закрепить
              </>
            )}
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          {post.status === "draft" && (
            <DropdownMenuItem onClick={onToggleStatus}>
              <Send className="w-4 h-4" /> Опубликовать
            </DropdownMenuItem>
          )}
          {post.status === "published" && (
            <DropdownMenuItem onClick={onToggleStatus}>
              <FileEdit className="w-4 h-4" /> В черновики
            </DropdownMenuItem>
          )}
          {post.status === "archived" ? (
            <DropdownMenuItem onClick={onRestore}>
              <ArrowUpFromLine className="w-4 h-4" /> Восстановить
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={onArchive}>
              <Archive className="w-4 h-4" /> В архив
            </DropdownMenuItem>
          )}
          {post.status === "archived" && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={onDelete}>
                <Trash2 className="w-4 h-4" /> Удалить навсегда
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}