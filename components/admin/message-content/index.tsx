// components/admin/message-content.tsx
"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import "./message-content.css";

interface MessageContentProps {
  body: string | null;
  isStaff?: boolean;
  isSystem?: boolean;
  className?: string;
}

/**
 * Универсальный рендерер контента сообщения.
 *
 * Логика:
 *  - isSystem → plain text (системные сообщения типа "Чат заблокирован")
 *  - isStaff  → markdown в "чат-режиме" (сообщения администрации, шаблоны поддержки)
 *  - обычный юзер → plain text с переносами (whitespace-pre-line)
 *
 * "Чат-режим" markdown отличается от стандартного Markdown:
 *  - одиночный \n = перенос строки (через remark-breaks)
 *  - множественные пробелы сохраняются
 *  - табы сохраняются как 4 неразрывных пробела
 *  - ведущие пробелы в обычных строках сохраняются
 *  - несколько пустых строк сохраняются
 *
 * Реализовано через preprocessMarkdown() — см. ниже.
 *
 * Стили: components/admin/message-content.css (один CSS для чата и превью редактора).
 *
 * Никакого dangerouslySetInnerHTML, никакого HTML-санитайзера.
 */

/**
 * Препроцессинг markdown перед передачей в react-markdown.
 *
 * Стандартный Markdown схлопывает:
 *  - несколько пробелов подряд → один пробел
 *  - табы → один пробел
 *  - ведущие пробелы (до 3) в начале строки → игнорируются
 *  - 4+ пробела в начале → code block (что часто нежелательно в чате)
 *  - несколько пустых строк → одна пустая строка
 *
 * Для чат-режима мы хотим сохранить всё это. Решение — заменить "съедаемые"
 * символы на неразрывный пробел \u00A0 (non-breaking space). React-markdown
 * его не схлопывает, и в браузере он рендерится как обычный пробел.
 *
 * Алгоритм:
 *  1. Нормализуем \r\n → \n
 *  2. Вырезаем code blocks (```...```) в плейсхолдеры — НЕ трогаем их содержимое
 *  3. Вырезаем inline code (`...`) в плейсхолдеры — НЕ трогаем их содержимое
 *  4. Табы → 4 неразрывных пробела
 *  5. Для каждой строки:
 *     - Если это строка с markdown-префиксом (#, -, *, +, >, 1., |) — не трогаем ведущие пробелы
 *       (потому что они часть синтаксиса Markdown, например для вложенных списков)
 *     - Иначе заменяем ведущие пробелы на \u00A0
 *     - Множественные пробелы внутри строки → \u00A0 (кроме первого)
 *     - Trailing пробелы → \u00A0
 *  6. Несколько пустых строк → каждая лишняя становится параграфом с \u00A0
 *  7. Возвращаем code blocks и inline code из плейсхолдеров
 *
 * Пример:
 *   "Привет     мир\n    отступ\n```\ncode\n```"
 * превращается в:
 *   "Привет \u00A0\u00A0\u00A0\u00A0мир\n\u00A0\u00A0\u00A0\u00A0отступ\n```\ncode\n```"
 */
function preprocessMarkdown(md: string | null | undefined): string {
  if (!md) return "";

  // 1. Нормализуем \r\n → \n
  let result = md.replace(/\r\n/g, "\n");

  // 2. Вырезаем code blocks (```...```) в плейсхолдеры
  const codeBlocks: string[] = [];
  result = result.replace(/```[\s\S]*?```/g, (match) => {
    codeBlocks.push(match);
    return `\u0000CB${codeBlocks.length - 1}\u0000`;
  });

  // 3. Вырезаем inline code (`...`) в плейсхолдеры
  const inlineCodes: string[] = [];
  result = result.replace(/`[^`\n]+`/g, (match) => {
    inlineCodes.push(match);
    return `\u0000IC${inlineCodes.length - 1}\u0000`;
  });

  // 4. Табы → 4 неразрывных пробела
  result = result.replace(/\t/g, "\u00A0\u00A0\u00A0\u00A0");

  // 5. Обрабатываем строки
  result = result.split("\n").map((line) => {
    // Пустая строка — пропускаем
    if (line === "") return line;

    // Если строка начинается с markdown-префикса — НЕ трогаем ведущие пробелы
    // (это часть синтаксиса: вложенные списки, заголовки, цитаты)
    const hasMarkdownPrefix = /^(\s*[-*+]\s+|\s*\d+\.\s+|\s*>\s+|\s*#{1,6}\s+|\s*\|)/.test(line);
    if (hasMarkdownPrefix) {
      // Но заменяем множественные пробелы в остальной части строки (после префикса)
      // и trailing пробелы
      return line.replace(/  +/g, (match) => " " + "\u00A0".repeat(match.length - 1))
                 .replace(/\s+$/g, (match) => "\u00A0".repeat(match.length));
    }

    // Обычная строка — сохраняем ведущие пробелы и множественные пробелы внутри
    // Ведущие пробелы → \u00A0
    const leadingMatch = line.match(/^( +)/);
    let processedLine = line;
    if (leadingMatch) {
      const leadingSpaces = leadingMatch[1];
      processedLine = "\u00A0".repeat(leadingSpaces.length) + line.substring(leadingSpaces.length);
    }

    // Множественные пробелы внутри строки → первый обычный, остальные \u00A0
    processedLine = processedLine.replace(/  +/g, (match) => " " + "\u00A0".repeat(match.length - 1));

    // Trailing пробелы → \u00A0
    processedLine = processedLine.replace(/\s+$/g, (match) => "\u00A0".repeat(match.length));

    return processedLine;
  }).join("\n");

  // 6. Несколько пустых строк → каждая лишняя становится параграфом с \u00A0
  result = result.replace(/\n{3,}/g, (match) => {
    const extraEmptyLines = match.length - 2;
    return "\n\n" + Array(extraEmptyLines).fill("\u00A0\n\n").join("");
  });

  // 7. Возвращаем inline code из плейсхолдеров
  result = result.replace(/\u0000IC(\d+)\u0000/g, (_, idx) => inlineCodes[Number(idx)]);

  // 8. Возвращаем code blocks из плейсхолдеров
  result = result.replace(/\u0000CB(\d+)\u0000/g, (_, idx) => codeBlocks[Number(idx)]);

  return result;
}

export function MessageContent({
  body,
  isStaff = false,
  isSystem = false,
  className = "",
}: MessageContentProps) {
  // Системные сообщения — plain text без markdown
  if (isSystem) {
    return <span className={className}>{body}</span>;
  }

  // Сообщения администрации — рендерим как markdown в чат-режиме
  if (isStaff) {
    const processedBody = preprocessMarkdown(body);
    return (
      <div className={`message-content-markdown ${className}`}>
        <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
          {processedBody}
        </ReactMarkdown>
      </div>
    );
  }

  // Обычные юзеры — plain text с переносами строк
  return <span className={`${className} whitespace-pre-line break-words`}>{body}</span>;
}

/**
 * Утилита: превращает markdown в plain text (для превью в списках).
 * Используется в превью последнего сообщения в сайдбаре чатов.
 */
export function stripMarkdown(md: string | null | undefined): string {
  if (!md) return "";
  return md
    .replace(/^#{1,6}\s+/gm, "")           // заголовки
    .replace(/\*\*([^*]+)\*\*/g, "$1")     // bold
    .replace(/\*([^*]+)\*/g, "$1")         // italic
    .replace(/~~([^~]+)~~/g, "$1")          // strikethrough
    .replace(/`([^`]+)`/g, "$1")           // inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links → text
    .replace(/^>\s+/gm, "")                 // blockquote
    .replace(/^[-*+]\s+/gm, "")             // unordered list
    .replace(/^\d+\.\s+/gm, "")             // ordered list
    .replace(/^```[\s\S]*?```/gm, "")       // code blocks
    .replace(/`{3}/g, "")                   // code fence remnants
    .replace(/\n{3,}/g, "\n\n")             // multiple newlines
    .trim();
}
