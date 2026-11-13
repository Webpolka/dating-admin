// app/(admin)/system/broadcasts/_components/broadcast-content-card.tsx
"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PostEditor } from "@/components/admin/post-editor";
import type { BroadcastType } from "@/hooks/admin/use-broadcasts";

interface Props {
  title: string;
  type: BroadcastType;
  message: string;
  emailBody: string;
  actionUrl: string;
  isLocked: boolean;
  errors: Record<string, string>;
  onTitleChange: (value: string) => void;
  onMessageChange: (value: string) => void;
  onEmailBodyChange: (html: string) => void;
  onActionUrlChange: (value: string) => void;
  onClearError: (field: string) => void;
}

/**
 * Карточка контента рассылки: заголовок, текст/HTML, URL для перехода.
 * Вынесено из broadcast-form-client.tsx (был 731 строка, разбит на 5 файлов).
 */
export function BroadcastContentCard({
  title,
  type,
  message,
  emailBody,
  actionUrl,
  isLocked,
  errors,
  onTitleChange,
  onMessageChange,
  onEmailBodyChange,
  onActionUrlChange,
  onClearError,
}: Props) {
  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-sm flex flex-col gap-4 w-full min-h-125">
      {/* Title */}
      <div className="flex flex-col gap-2 shrink-0">
        <Label htmlFor="title">
          Заголовок уведомления <span className="text-destructive">*</span>
        </Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => { onTitleChange(e.target.value); onClearError("title"); }}
          placeholder="Например: Скидки на VIP!"
          disabled={isLocked}
          className={errors.title ? "border-destructive" : ""}
        />
        {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
      </div>

      {/* Message / Email body */}
      <div className="flex flex-col gap-2 flex-1 min-h-0">
        {type === "email" ? (
          <>
            <div className="flex items-center justify-between">
              <Label>HTML верстка письма <span className="text-destructive">*</span></Label>
              <span className="text-xs text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-md">Email режим</span>
            </div>
            <div className={errors.email_body ? "rounded-lg ring-2 ring-destructive" : ""}>
            <PostEditor
                value={emailBody}
                onChange={onEmailBodyChange}
                placeholder="Введите текст письма..."
                // Compact-режим: высота как у Textarea (rows=10 ~ 250px),
                // иначе PostEditor занимает 450px+ и растягивает форму.
                containerClassName="border border-border rounded-lg overflow-hidden flex flex-col min-h-120"
              />
            </div>
            {errors.email_body && <p className="text-xs text-destructive">{errors.email_body}</p>}
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <Label>Текст сообщения <span className="text-destructive">*</span></Label>
              <span className="text-xs text-green-500 bg-green-500/10 px-2 py-0.5 rounded-md">
                {type === "push" ? "Push режим" : "In-App режим"}
              </span>
            </div>
            <Textarea
              value={message}
              onChange={(e) => { onMessageChange(e.target.value); onClearError("message"); }}
              rows={10}
              placeholder="Введите обычный текст без HTML тегов..."
              className={`resize-none flex-1 min-h-75 ${errors.message ? "border-destructive" : ""}`}
              disabled={isLocked}
            />
            {errors.message && <p className="text-xs text-destructive">{errors.message}</p>}
            <p className="text-xs text-muted-foreground">
              Обычный текст. HTML-теги не поддерживаются.
            </p>
          </>
        )}
      </div>

      {/* Action URL */}
      <div className="flex flex-col gap-2 shrink-0">
        <Label htmlFor="actionUrl">URL для перехода (необязательно)</Label>
        <Input
          id="actionUrl"
          value={actionUrl}
          onChange={(e) => { onActionUrlChange(e.target.value); onClearError("action_url"); }}
          type="url"
          placeholder="https://site.com/promo/vip"
          disabled={isLocked}
          className={errors.action_url ? "border-destructive" : ""}
        />
        {errors.action_url && <p className="text-xs text-destructive">{errors.action_url}</p>}
        <p className="text-xs text-muted-foreground">
          Куда вести пользователя при клике на пуш, кнопку в письме или колокольчик.
        </p>
      </div>
    </div>
  );
}