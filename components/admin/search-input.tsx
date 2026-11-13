"use client";

// components/admin/search-input.tsx
//
// Поле поиска с лупой слева и крестиком очистки справа.
//
// Заменяет копипасту «relative div + Search иконка + Input pl-9 pr-8 +
// button с X», повторявшуюся в каждом списочном компоненте.
//
// Контролируемый компонент: значение и debounce живут на стороне
// страницы (useDebouncedValue), здесь только UI. Очистка через
// крестик вызывает onChange("") — useDebouncedValue применяет пустую
// строку мгновенно, без задержки.

import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Ширина контейнера. По умолчанию w-64 (стандарт списков). */
  className?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Поиск...",
  className = "w-64",
}: SearchInputProps) {
  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
      <Input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-9 pr-8"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Очистить поиск"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground z-10"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
