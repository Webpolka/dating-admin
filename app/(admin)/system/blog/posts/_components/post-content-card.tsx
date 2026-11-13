// app/(admin)/system/blog/posts/_components/post-content-card.tsx
"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PostEditor } from "@/components/admin/post-editor";

interface Props {
  title: string;
  body: string;
  hasTitleError: boolean;
  hasBodyError: boolean;
  titleError: string | null;
  bodyError: string | null;
  onTitleChange: (val: string) => void;
  onBodyChange: (html: string) => void;
}

/**
 * Карточка контента поста: заголовок + редактор тела (TipTap).
 * Вынесено из post-form-client.tsx (был 531 строка, разбит на 3 файла).
 */
export function PostContentCard({
  title,
  body,
  hasTitleError,
  hasBodyError,
  titleError,
  bodyError,
  onTitleChange,
  onBodyChange,
}: Props) {
  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-sm flex flex-col gap-4 w-full">
      {/* Title */}
      <div className="flex flex-col gap-2 shrink-0">
        <Label htmlFor="title">Заголовок поста</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Введите заголовок"
          className={hasTitleError ? "border-destructive focus-visible:ring-destructive" : ""}
        />
        {titleError && <p className="text-xs text-destructive">{titleError}</p>}
      </div>

      {/* Body */}
      <div className="flex flex-col gap-2 flex-1 min-h-0">
        <Label className="shrink-0">Текст поста</Label>
        <div className={hasBodyError ? "rounded-lg ring-2 ring-destructive" : ""}>
          <PostEditor value={body} onChange={onBodyChange} />
        </div>
        {bodyError && <p className="text-xs text-destructive">{bodyError}</p>}
      </div>
    </div>
  );
}