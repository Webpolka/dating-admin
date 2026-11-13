// components/admin/markdown-editor.tsx
"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageContent } from "@/components/admin/message-content";
import {
  Bold, Italic, Strikethrough, Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Link as LinkIcon, Code as CodeIcon, Code2,
  Eye, Pencil,
} from "lucide-react";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/**
 * Markdown-редактор с панелью кнопок и переключателем "Редактор/Превью".
 *
 * Превью использует тот же MessageContent (и тот же CSS-файл),
 * что и баблы чата поддержки → 100% синхронизация отображения.
 *
 * В БД сохраняется markdown-строка.
 */
export function MarkdownEditor({
  value,
  onChange,
  placeholder = "Введите текст в Markdown...",
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isPreview, setIsPreview] = useState(false);

  // Обернуть выделенный текст в before/after.
  // Если ничего не выделено — вставляет placeholder.
  // toggle: если выделение уже обёрнуто — снимает форматирование.
  const wrapSelection = (
    before: string,
    after: string = before,
    placeholder: string = "текст"
  ) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);

    // Проверяем toggle: если выделение уже обёрнуто — снимаем
    if (
      selectedText.length > 0 &&
      selectedText.startsWith(before) &&
      selectedText.endsWith(after)
    ) {
      const unwrapped = selectedText.slice(before.length, selectedText.length - after.length);
      const newText = value.substring(0, start) + unwrapped + value.substring(end);
      onChange(newText);
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(start, start + unwrapped.length);
      });
      return;
    }

    // Если ничего не выделено — вставляем placeholder
    const textToInsert = selectedText || placeholder;
    const newText = value.substring(0, start) + before + textToInsert + after + value.substring(end);
    onChange(newText);

    requestAnimationFrame(() => {
      textarea.focus();
      const newStart = start + before.length;
      const newEnd = newStart + textToInsert.length;
      textarea.setSelectionRange(newStart, newEnd);
    });
  };

  // Вставить префикс в начало КАЖДОЙ выделенной строки.
  // Если ничего не выделено — обрабатывает строку где курсор.
  // toggle: если все строки уже с этим префиксом — убираем его.
  // counter=true → нумерация 1, 2, 3... для ordered list.
  const prefixLines = (prefix: string, counter: boolean = false) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const blockStart = value.lastIndexOf("\n", start - 1) + 1;
    const blockEnd = value.indexOf("\n", end);
    const finalBlockEnd = blockEnd === -1 ? value.length : blockEnd;

    const block = value.substring(blockStart, finalBlockEnd);
    const lines = block.split("\n");

    // Шаблоны существующих префиксов для проверки toggle
    const prefixPatterns = [
      /^\d+\.\s+/,   // "1. " ordered list
      /^[-*+]\s+/,    // "- " unordered list
      /^#{1,6}\s+/,   // "# " heading
      /^>\s+/,        // "> " blockquote
    ];

    // Проверяем: все ли непустые строки уже имеют этот префикс?
    const checkPattern = counter ? /^\d+\.\s+/ : new RegExp("^" + prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const allHavePrefix = lines.every((line) => {
      if (line.trim() === "") return true;
      return checkPattern.test(line);
    });

    let counterIdx = 1;
    const newLines = lines.map((line) => {
      if (line.trim() === "") return line;

      // Убираем любой существующий префикс списка/заголовка/цитаты
      let cleanLine = line;
      for (const pattern of prefixPatterns) {
        if (pattern.test(cleanLine)) {
          cleanLine = cleanLine.replace(pattern, "");
          break;
        }
      }

      // Если все строки уже имели нужный префикс — toggle off (без префикса)
      if (allHavePrefix) {
        return cleanLine;
      }

      const actualPrefix = counter ? `${counterIdx}. ` : prefix;
      counterIdx++;
      return actualPrefix + cleanLine;
    });

    const newBlock = newLines.join("\n");
    const newText = value.substring(0, blockStart) + newBlock + value.substring(finalBlockEnd);
    onChange(newText);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(blockStart, blockStart + newBlock.length);
    });
  };

  // Хендлеры кнопок
  const handleBold = () => wrapSelection("**", "**", "жирный текст");
  const handleItalic = () => wrapSelection("*", "*", "курсив");
  const handleStrike = () => wrapSelection("~~", "~~", "зачёркнутый");
  const handleCode = () => wrapSelection("`", "`", "код");
  const handleCodeBlock = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.substring(start, end) || "код";
    const newText = value.substring(0, start) + "\n```\n" + selected + "\n```\n" + value.substring(end);
    onChange(newText);
    requestAnimationFrame(() => {
      textarea.focus();
      const newStart = start + 5;
      textarea.setSelectionRange(newStart, newStart + selected.length);
    });
  };

  const handleH1 = () => prefixLines("# ");
  const handleH2 = () => prefixLines("## ");
  const handleH3 = () => prefixLines("### ");
  const handleUL = () => prefixLines("- ");
  const handleOL = () => prefixLines("", true);
  const handleQuote = () => prefixLines("> ");

  const handleLink = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end) || "текст ссылки";
    const newText = value.substring(0, start) + `[${selectedText}](https://)` + value.substring(end);
    onChange(newText);
    requestAnimationFrame(() => {
      textarea.focus();
      const urlStart = start + selectedText.length + 3;
      textarea.setSelectionRange(urlStart, urlStart + "https://".length);
    });
  };

  const toolbarButtons = [
    { icon: Bold, action: handleBold, title: "Жирный (**текст**)" },
    { icon: Italic, action: handleItalic, title: "Курсив (*текст*)" },
    { icon: Strikethrough, action: handleStrike, title: "Зачёркнутый (~~текст~~)" },
    { icon: CodeIcon, action: handleCode, title: "Код (`текст`)" },
    { icon: Code2, action: handleCodeBlock, title: "Блок кода (```...```)" },
    { icon: Heading1, action: handleH1, title: "Заголовок 1" },
    { icon: Heading2, action: handleH2, title: "Заголовок 2" },
    { icon: Heading3, action: handleH3, title: "Заголовок 3" },
    { icon: List, action: handleUL, title: "Маркированный список (- текст)" },
    { icon: ListOrdered, action: handleOL, title: "Нумерованный список (1. текст)" },
    { icon: Quote, action: handleQuote, title: "Цитата (> текст)" },
    { icon: LinkIcon, action: handleLink, title: "Ссылка [текст](url)" },
  ];

  return (
    <div className="border border-border rounded-lg overflow-hidden flex flex-col  min-h-115">
      {/* Панель инструментов */}
      <div className="flex flex-wrap gap-1 p-2 border-b border-border bg-muted/30 shrink-0 items-center">
        {/* Ложное срабатывание react-hooks/refs: ref (textareaRef.current)
            читается только внутри onClick-хендлеров кнопок тулбара,
            не во время рендера. */}
        {/* eslint-disable-next-line react-hooks/refs */}
        {!isPreview && toolbarButtons.map((btn, i) => (
          <Button
            key={i}
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={btn.action}
            title={btn.title}
          >
            <btn.icon className="w-4 h-4" />
          </Button>
        ))}

        <div className="ml-auto flex items-center gap-1">
          <Button
            type="button"
            variant={!isPreview ? "secondary" : "ghost"}
            size="sm"
            className="h-8 gap-1"
            onClick={() => setIsPreview(false)}
          >
            <Pencil className="w-4 h-4" />
            Редактор
          </Button>
          <Button
            type="button"
            variant={isPreview ? "secondary" : "ghost"}
            size="sm"
            className="h-8 gap-1"
            onClick={() => setIsPreview(true)}
          >
            <Eye className="w-4 h-4" />
            Превью
          </Button>
        </div>
      </div>

      {/* Область редактирования / превью */}
      {isPreview ? (
        // Превью использует MessageContent → СSS полностью синхронизирован с чатом
        <div className="flex-1 min-h-0 overflow-y-auto bg-background p-4">
          <div className="max-w-none text-foreground">
            <MessageContent
              body={value}
              isStaff={true}
              isSystem={false}
              className="!text-foreground"
            />
          </div>
        </div>
      ) : (
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="border-0 rounded-none font-mono text-sm flex-1 min-h-0 resize-none focus-visible:ring-0"
          onKeyDown={(e) => {
            // Tab → 2 пробела (а не смена фокуса)
            if (e.key === "Tab") {
              e.preventDefault();
              const textarea = textareaRef.current;
              if (!textarea) return;
              const start = textarea.selectionStart;
              const end = textarea.selectionEnd;
              const newText = value.substring(0, start) + "  " + value.substring(end);
              onChange(newText);
              requestAnimationFrame(() => {
                textarea.focus();
                textarea.setSelectionRange(start + 2, start + 2);
              });
            }
          }}
        />
      )}
    </div>
  );
}
