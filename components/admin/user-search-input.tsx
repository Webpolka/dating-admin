// components/admin/user-search-input.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchUsers } from "@/hooks/admin/use-search-users";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, X } from "lucide-react";
import type { SearchUserItem } from "@/hooks/admin/use-search-users";
import { UserBadge } from "@/components/admin/user-badge";
import { cn } from "@/lib/utils";

interface UserSearchInputProps {
  onSelect: (user: SearchUserItem) => void;
  selectedUser: SearchUserItem | null;
  onClear: () => void;
  disabled?: boolean;
}

export function UserSearchInput({
  onSelect,
  selectedUser,
  onClear,
  disabled = false,
}: UserSearchInputProps) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useSearchUsers(debouncedSearch, debouncedSearch.length >= 2);
  const users: SearchUserItem[] = data?.data ?? [];

  // Сбрасываем активный индекс при изменении поиска
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveIndex(-1);
  }, [search]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Скролл к активному элементу
  useEffect(() => {
    if (activeIndex >= 0 && itemRefs.current[activeIndex]) {
      itemRefs.current[activeIndex]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [activeIndex]);

  const handleSelect = (user: SearchUserItem) => {
    onSelect(user);
    setSearch("");
    setDebouncedSearch("");
    setIsDropdownOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isDropdownOpen || users.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, users.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < users.length) {
        handleSelect(users[activeIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsDropdownOpen(false);
      setActiveIndex(-1);
    }
  };

  // ✅ Если юзер выбран — показываем красивый UserBadge
  // Если юзер выбран — показываем UserBadge + ID для визуального контроля.
  if (selectedUser) {
    return (
      <div className="flex items-center justify-between p-2 border border-border rounded-md bg-muted/20">
        <div className="flex gap-2 min-w-0">
          <UserBadge user={selectedUser} showEmail={true} />
          {/* ID рядом — для визуального контроля при поиске по ID */}
          <Badge variant="outline" className="font-mono text-[10px] shrink-0">
            #{selectedUser.id}
          </Badge>
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={onClear}
            className="text-muted-foreground hover:text-destructive shrink-0 p-1 ml-2"
            title="Сбросить выбор"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  if (disabled) {
    return (
      <div className="flex items-center justify-between p-2 border border-border rounded-md bg-muted/20">
        <span className="text-sm text-muted-foreground">Не выбран</span>
      </div>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
      <Input
        type="text"
        placeholder="Имя, Email или ID..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setIsDropdownOpen(true);
        }}
        onFocus={() => setIsDropdownOpen(true)}
        onKeyDown={handleKeyDown} // ✅ Навигация стрелками
        className="pl-9 pr-8"
      />
      {isLoading && (
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />
      )}
      {!isLoading && search && (
        <button
          type="button"
          onClick={() => {
            setSearch("");
            setDebouncedSearch("");
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground z-10"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {isDropdownOpen && (debouncedSearch.length >= 2) && (
        <div className="absolute z-50 top-full mt-1 w-full rounded-lg max-h-60 overflow-y-auto bg-card shadow-lg border border-border">
          {isLoading ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
              Поиск...
            </div>
          ) : users.length > 0 ? (
                        users.map((user, index) => (
              <button
                key={user.id}
                ref={(el) => { itemRefs.current[index] = el; }}
                type="button"
                onClick={() => handleSelect(user)}
                onMouseEnter={() => setActiveIndex(index)}
                className={cn(
                  "w-full p-3 flex items-center gap-3 text-left transition-colors",
                  activeIndex === index ? "bg-muted/70" : "hover:bg-muted/40"
                )}
              >
                <UserBadge user={user} showEmail={true} />
                {/* ID в конце строки — для визуального сравнения при поиске по ID */}
                <Badge variant="outline" className="font-mono text-[10px] shrink-0 ml-auto">
                  #{user.id}
                </Badge>
              </button>
            ))
          ) : (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Пользователи не найдены
            </div>
          )}
        </div>
      )}
    </div>
  );
}