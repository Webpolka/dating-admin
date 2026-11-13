// app/(admin)/communication/support/_components/support-message-input.tsx
"use client";

import { useState, useEffect, useMemo, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FileText, Loader2, Send } from "lucide-react";
import { useSupportTemplates, type SupportTemplate } from "@/hooks/admin/use-support-chats";

// ============================================================
// Поле ввода сообщения + кнопка шаблонов (с авто-resize до 6 строк)
// ============================================================
export function MessageInput({
  inputRef,
  onSend,
  isSending,
}: {
  inputRef: RefObject<HTMLTextAreaElement | null>;
  onSend: (body: string) => void;
  isSending: boolean;
}) {
  const [body, setBody] = useState("");
  const { data: templates } = useSupportTemplates();

  const groupedTemplates = useMemo(() => {
    const groups: Record<string, SupportTemplate[]> = {};
    (templates ?? []).forEach((t) => {
      if (!groups[t.category]) groups[t.category] = [];
      groups[t.category].push(t);
    });
    return groups;
  }, [templates]);

  const MAX_ROWS = 6;

  const adjustHeight = () => {
    const textarea = inputRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 20;
    const maxHeight = lineHeight * MAX_ROWS + 24;
    if (textarea.scrollHeight <= maxHeight) {
      textarea.style.height = `${textarea.scrollHeight}px`;
    } else {
      textarea.style.height = `${maxHeight}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [body]);

  const handleSend = () => {
    const trimmed = body.trim();
    if (!trimmed || isSending) return;
    onSend(trimmed);
    setBody("");
    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.style.height = "auto";
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const insertTemplate = (templateBody: string) => {
    setBody(templateBody);
    inputRef.current?.focus();
  };

  return (
    <div className="shrink-0 mt-4 space-y-2">
      <div className="relative">
        <textarea
          ref={inputRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Введите сообщение... (Enter — отправить, Shift+Enter — новая строка)"
          rows={1}
          className="bg-card w-full resize-none overflow-y-auto px-4 py-4 pr-24 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm leading-relaxed transition-[height] duration-100"
        />

        <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
          <Popover>
            <PopoverTrigger render={
              <Button
                variant="default"
                size="icon"
                className="h-9 w-9 rounded-lg shadow-sm"
                title="Вставить шаблон"
                disabled={!templates || templates.length === 0}
              >
                <FileText className="w-4 h-4" />
              </Button>
            }/>
            <PopoverContent className="w-80 p-0" align="end">
              <div className="max-h-80 overflow-y-auto p-2 little-scroll">
                {templates && templates.length === 0 && (
                  <div className="px-2 py-4 text-center text-xs text-muted-foreground">
                    Шаблонов пока нет
                  </div>
                )}
                {Object.entries(groupedTemplates).map(([category, items]) => (
                  <div key={category}>
                    <div className="px-2 py-1.5 mt-1 text-[10px] font-bold uppercase text-muted-foreground/70">
                      {category}
                    </div>
                    {items.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => insertTemplate(t.body)}
                        className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-primary/10 hover:text-primary transition-colors"
                      >
                        {t.title}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <Button
            onClick={handleSend}
            disabled={isSending || !body.trim()}
            size="icon"
            className="h-9 w-9 rounded-lg shadow-md bg-green-600 hover:bg-green-700 text-white"
            title="Отправить (Enter)"
          >
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <FileText className="w-3 h-3" />
        Нажмите на иконку шаблонов слева от кнопки отправки для вставки готового ответа.
      </p>
    </div>
  );
}