// components/admin/post-editor.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code as CodeIcon,
  Code2,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Undo,
  Redo,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  Image as ImageIcon,
  Wand2,
} from "lucide-react";

interface PostEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /**
   * CSS-класс для корневого контейнера. По умолчанию — большая высота
   * (h-[calc(100vh-280px)] min-h-[450px]) для блог-постов.
   * Для compact-режима (например, в форме рассылки) передавай
   * containerClassName="h-[320px] min-h-[280px]".
   */
  containerClassName?: string;
}

export function PostEditor({ value, onChange, placeholder = "Введите текст поста...", containerClassName }: PostEditorProps) {
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [htmlDraft, setHtmlDraft] = useState(value);
  const [isInitialized, setIsInitialized] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [imageOpen, setImageOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");

  // Запоминаем отформатированный HTML (для сохранения между переключениями режимов)
  const formattedHtmlRef = useRef<string | null>(value);

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

 const editor = useEditor({
  immediatelyRender: false,
    extensions: [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      // Отключаем Link и Underline в StarterKit — мы подключаем их
      // отдельно с кастомной конфигурацией. Без этого TipTap выдаёт
      // warning "Duplicate extension names found: ['link', 'underline']".
      link: false,
      underline: false,
    }),
    Underline,
    Link.configure({
      openOnClick: false,
      HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
    }),
    Image.configure({ inline: false, allowBase64: false }),
    TextAlign.configure({ types: ["heading", "paragraph"] }),
  ],
    content: value || "",
    editorProps: {
      attributes: {
        class: "max-w-none focus:outline-none p-4 min-h-full",
      },
    },
    onUpdate: ({ editor }) => {
      onChangeRef.current(editor.getHTML());
      formattedHtmlRef.current = null;
    },
    onCreate: () => {
      setIsInitialized(true);
    },
  });

  // Инициализация данных только один раз
  useEffect(() => {
    if (editor && value && !isInitialized) {
      editor.commands.setContent(value);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHtmlDraft(value);
      formattedHtmlRef.current = value;
      setIsInitialized(true);
    }
  }, [editor, value, isInitialized]);

  // Sync external value when editor not focused (e.g. when loading post
  // or after save when Purifier sanitized the body).
  useEffect(() => {
    if (!editor || !isInitialized) return;

    if (isHtmlMode) {
      // В HTML-режиме синхронизируем textarea (htmlDraft).
      // Срабатывает после save, когда бэк вернул очищенный body.
      if (value !== htmlDraft) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setHtmlDraft(value);
        formattedHtmlRef.current = value;
      }
      return;
    }

    // В WYSIWYG-режиме синхронизируем редактор.
    const current = editor.getHTML();
    if (value !== current && !editor.isFocused) {
      editor.commands.setContent(value || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, isInitialized]);

  // Обработка переключения режимов
  useEffect(() => {
    if (!editor) return;

    if (isHtmlMode) {
      // Переход в HTML режим
      if (formattedHtmlRef.current !== null) {
        setHtmlDraft(formattedHtmlRef.current);
      } else {
        const freshHtml = editor.getHTML();
        setHtmlDraft(freshHtml);
        formattedHtmlRef.current = freshHtml;
      }
    } else {
      // Возврат в WYSIWYG
      editor.commands.setContent(htmlDraft || "");
      onChangeRef.current(htmlDraft);
      formattedHtmlRef.current = htmlDraft;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHtmlMode, editor]);

  const toggleHtmlMode = () => {
    if (!editor) return;
    setIsHtmlMode(!isHtmlMode);
  };

  // === Форматирование HTML ===
  const formatHtml = () => {
    try {
      let formatted = htmlDraft;
      formatted = formatted.replace(/>(?=<)/g, ">\n");
      formatted = formatted.replace(/^\s*[\r\n]/gm, "");

      const lines = formatted.split("\n");
      let indent = 0;
      const indentStr = "  ";

      const result = lines
        .map((line) => {
          line = line.trim();
          if (!line) return "";
          if (line.startsWith("</")) {
            indent = Math.max(0, indent - 1);
          }
          const formattedLine = indentStr.repeat(indent) + line;
          if (
            line.startsWith("<") &&
            !line.startsWith("</") &&
            !line.startsWith("<img") &&
            !line.startsWith("<br") &&
            !line.endsWith("/>") &&
            !line.includes("</")
          ) {
            indent++;
          }
          return formattedLine;
        })
        .filter((l) => l !== "")
        .join("\n");

      setHtmlDraft(result);
      onChangeRef.current(result);
      formattedHtmlRef.current = result;
    } catch (e) {
      console.error("Ошибка форматирования HTML:", e);
    }
  };

  // === Link dialog ===
  const openLinkDialog = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href || "";
    setLinkUrl(previousUrl);
    setLinkOpen(true);
  };

  const applyLink = () => {
    if (!editor) return;
    if (linkUrl) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: linkUrl }).run();
    } else {
      editor.chain().focus().unsetLink().run();
    }
    setLinkOpen(false);
    setLinkUrl("");
  };

  // === Image dialog ===
  const applyImage = () => {
    if (!editor || !imageUrl) return;
    editor.chain().focus().setImage({ src: imageUrl, alt: imageAlt }).run();
    setImageOpen(false);
    setImageUrl("");
    setImageAlt("");
  };

  if (!editor) {
    return (
      <div className="border border-border rounded-md min-h-100 flex items-center justify-center text-muted-foreground text-sm">
        Загрузка редактора...
      </div>
    );
  }

  const toolbarButtons = [
    { icon: Bold, action: () => editor.chain().focus().toggleBold().run(), isActive: editor.isActive("bold"), title: "Жирный" },
    { icon: Italic, action: () => editor.chain().focus().toggleItalic().run(), isActive: editor.isActive("italic"), title: "Курсив" },
    { icon: UnderlineIcon, action: () => editor.chain().focus().toggleUnderline().run(), isActive: editor.isActive("underline"), title: "Подчёркнутый" },
    { icon: Strikethrough, action: () => editor.chain().focus().toggleStrike().run(), isActive: editor.isActive("strike"), title: "Зачёркнутый" },
    { icon: CodeIcon, action: () => editor.chain().focus().toggleCode().run(), isActive: editor.isActive("code"), title: "Код" },
    { icon: Code2, action: () => editor.chain().focus().toggleCodeBlock().run(), isActive: editor.isActive("codeBlock"), title: "Блок кода" },
    { icon: Heading1, action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), isActive: editor.isActive("heading", { level: 1 }), title: "Заголовок 1" },
    { icon: Heading2, action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), isActive: editor.isActive("heading", { level: 2 }), title: "Заголовок 2" },
    { icon: Heading3, action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), isActive: editor.isActive("heading", { level: 3 }), title: "Заголовок 3" },
    { icon: List, action: () => editor.chain().focus().toggleBulletList().run(), isActive: editor.isActive("bulletList"), title: "Список" },
    { icon: ListOrdered, action: () => editor.chain().focus().toggleOrderedList().run(), isActive: editor.isActive("orderedList"), title: "Нумерованный список" },
    { icon: Quote, action: () => editor.chain().focus().toggleBlockquote().run(), isActive: editor.isActive("blockquote"), title: "Цитата" },
    { icon: AlignLeft, action: () => editor.chain().focus().setTextAlign("left").run(), isActive: editor.isActive({ textAlign: "left" }), title: "По левому краю" },
    { icon: AlignCenter, action: () => editor.chain().focus().setTextAlign("center").run(), isActive: editor.isActive({ textAlign: "center" }), title: "По центру" },
    { icon: AlignRight, action: () => editor.chain().focus().setTextAlign("right").run(), isActive: editor.isActive({ textAlign: "right" }), title: "По правому краю" },
  ];

  return (
    <>
      <div className={containerClassName ?? "border border-border rounded-lg overflow-hidden flex flex-col h-[calc(100vh-280px)] min-h-[450px]"}>
        {/* Панель инструментов */}
        <div className="flex flex-wrap gap-1 p-2 border-b border-border bg-muted/30 shrink-0">
          {!isHtmlMode && (
            <>
              {toolbarButtons.map((btn, i) => (
                <Button
                  key={i}
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={`h-8 w-8 ${btn.isActive ? "bg-primary/10 text-primary" : ""}`}
                  onClick={btn.action}
                  title={btn.title}
                >
                  <btn.icon className="w-4 h-4" />
                </Button>
              ))}

              <div className="w-px h-6 bg-border mx-1 my-1" />

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={`h-8 w-8 ${editor.isActive("link") ? "bg-primary/10 text-primary" : ""}`}
                onClick={openLinkDialog}
                title="Ссылка"
              >
                <LinkIcon className="w-4 h-4" />
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setImageOpen(true)}
                title="Изображение"
              >
                <ImageIcon className="w-4 h-4" />
              </Button>

              <div className="w-px h-6 bg-border mx-1 my-1" />

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().undo()}
                title="Отменить"
              >
                <Undo className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().redo()}
                title="Повторить"
              >
                <Redo className="w-4 h-4" />
              </Button>
            </>
          )}

          {isHtmlMode && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1"
              onClick={formatHtml}
              title="Форматировать HTML"
            >
              <Wand2 className="w-4 h-4" />
              Форматировать
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={`h-8 ml-auto gap-1 ${isHtmlMode ? "bg-primary/10 text-primary" : ""}`}
            onClick={toggleHtmlMode}
            title={isHtmlMode ? "Переключить в WYSIWYG" : "Переключить в HTML"}
          >
            <Code2 className="w-4 h-4" />
            {isHtmlMode ? "WYSIWYG" : "HTML"}
          </Button>
        </div>

        {/* Область редактирования */}
        {isHtmlMode ? (
          <Textarea
            value={htmlDraft}
            onChange={(e) => {
              setHtmlDraft(e.target.value);
              onChangeRef.current(e.target.value);
              formattedHtmlRef.current = null;
            }}
            className="border-0 rounded-none font-mono text-sm flex-1 min-h-0 resize-none focus-visible:ring-0"
            placeholder="<p>Введите HTML код...</p>"
          />
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto bg-background">
            <EditorContent editor={editor} className="h-full" />
          </div>
        )}
      </div>

      {/* Модальное окно для ссылок */}
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Вставить ссылку</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="link-url">URL адрес</Label>
              <Input
                id="link-url"
                type="url"
                placeholder="https://example.com"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                autoFocus
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Выделите текст в редакторе, чтобы сделать его ссылкой. Если текст не выделен, ссылка будет вставлена как есть.
            </p>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline">Отмена</Button>} />
            <Button onClick={applyLink} disabled={!linkUrl}>
              Применить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Модальное окно для изображений */}
      <Dialog open={imageOpen} onOpenChange={setImageOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Вставить изображение</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="image-url">URL изображения</Label>
              <Input
                id="image-url"
                type="url"
                placeholder="https://example.com/image.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="image-alt">Описание (Alt text)</Label>
              <Input
                id="image-alt"
                type="text"
                placeholder="Что изображено на картинке"
                value={imageAlt}
                onChange={(e) => setImageAlt(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline">Отмена</Button>} />
            <Button onClick={applyImage} disabled={!imageUrl}>
              Вставить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}