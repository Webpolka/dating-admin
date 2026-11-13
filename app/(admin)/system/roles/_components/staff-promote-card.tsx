// app/(admin)/system/roles/_components/staff-promote-card.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserBadge } from "@/components/admin/user-badge";
import { ROLE_BADGES } from "@/lib/role-badge";
import { staffApi, type StaffCandidate } from "@/lib/api/staff";
import { extractErrorMessage } from "@/lib/api";
import { UserPlus, Search, Loader2 } from "lucide-react";
import { ROLES, SEARCH_DEBOUNCE_MS } from "./_shared";

export function StaffPromoteCard({ onPromoted }: { onPromoted: () => void }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // F8: per-row pending для promote. Если админ кликает "Саппорт" на одном
  // юзере и "Модератор" на другом — оба independently обрабатываются.
  // Раньше все кнопки блокировались глобально.
  const [promotingKeys, setPromotingKeys] = useState<Set<string>>(new Set());

  // ✅ State для навигации стрелками
  const [activeUserIndex, setActiveUserIndex] = useState(-1);
  const [activeButtonIndex, setActiveButtonIndex] = useState(-1);

  // F4: debounce 400ms вместо 800ms.
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handler);
  }, [search]);

  const { data: candidatesData, isLoading: isLoadingCandidates } = useQuery({
    queryKey: ["staffCandidates", debouncedSearch],
    queryFn: () => staffApi.searchCandidates(debouncedSearch),
    enabled: debouncedSearch.length > 0,
  });

  const candidates: StaffCandidate[] = candidatesData ?? [];

  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Сбрасываем индексы при новом поиске
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveUserIndex(-1);    
    setActiveButtonIndex(-1);
  }, [debouncedSearch]);

  // Click outside — закрываем dropdown.
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setSearch("");
        setDebouncedSearch("");
        setActiveUserIndex(-1);
        setActiveButtonIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const promoteMutation = useMutation({
    mutationFn: (params: { userId: number; role: string }) => staffApi.promote(params.userId, params.role),
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      setSearch("");
      setDebouncedSearch("");
      setActiveUserIndex(-1);
      setActiveButtonIndex(-1);
      onPromoted();
    },
    onError: (err: unknown) => {
      // F3: используем extractErrorMessage из lib/api.
      toast.error(extractErrorMessage(err, "Ошибка при повышении"));
    },
  });

  const showDropdown = (debouncedSearch.length > 0 || isLoadingCandidates) && search.length > 0;

  // F8: ключ `${userId}-${role}` — уникален для каждой связки юзер+роль.
  const handlePromote = (userId: number, role: string) => {
    const key = `${userId}-${role}`;
    setPromotingKeys((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
    promoteMutation.mutate(
      { userId, role },
      {
        onSettled: () => {
          setPromotingKeys((prev) => {
            const next = new Set(prev);
            next.delete(key);
            return next;
          });
        },
      }
    );
  };

  // ✅ Обработчик клавиатуры
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || candidates.length === 0) return;

    const rolesLength = ROLES.length;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveButtonIndex(-1);
      setActiveUserIndex((prev) => Math.min(prev + 1, candidates.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveButtonIndex(-1);
      setActiveUserIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "ArrowRight" && activeUserIndex >= 0) {
      e.preventDefault();
      setActiveButtonIndex((prev) => Math.min(prev + 1, rolesLength - 1));
    } else if (e.key === "ArrowLeft" && activeUserIndex >= 0) {
      e.preventDefault();
      setActiveButtonIndex((prev) => Math.max(prev - 1, -1));
    } else if ((e.key === "Enter" || e.key === " ") && activeUserIndex >= 0) {
      e.preventDefault();
      if (activeButtonIndex >= 0) {
        const candidate = candidates[activeUserIndex];
        const role = ROLES[activeButtonIndex].value;
        handlePromote(candidate.id, role);
      } else {
        // Если юзер выбран, но кнопка нет — фокусируемся на первой кнопке
        setActiveButtonIndex(0);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setSearch("");
      setDebouncedSearch("");
      setActiveUserIndex(-1);
      setActiveButtonIndex(-1);
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <UserPlus className="w-5 h-5" />
        Назначить сотрудника
      </h2>
      <p className="text-sm text-muted-foreground">
        Введите имя, email или ID юзера. Используйте стрелки ↑↓ для выбора, ←→ для роли, Enter — подтвердить.
      </p>

      <div className="relative w-full max-w-xl" ref={searchContainerRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
          <Input
            type="search"
            placeholder="Имя, Email или ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="pl-9"
            autoComplete="off"
          />
        </div>

        {showDropdown && (
          <div className="absolute z-50 top-full mt-1 w-full bg-card border border-border rounded-lg shadow-xl overflow-hidden overflow-y-auto max-h-[60dvh] animate-in fade-in slide-in-from-top-1 duration-200">
            {isLoadingCandidates ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                Поиск...
              </div>
            ) : candidates.length > 0 ? (
              candidates.map((candidate: StaffCandidate, uIndex: number) => (
                <div
                  key={candidate.id}
                  className={cn(
                    "border-b border-border last:border-b-0 px-3 py-2 transition-colors",
                    activeUserIndex === uIndex ? "bg-muted/20" : "hover:bg-muted/10"
                  )}
                  onMouseEnter={() => {
                    setActiveUserIndex(uIndex);
                    setActiveButtonIndex(-1);
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    {/* F12: StaffCandidate наследует UserBadgeData — каст не нужен. */}
                    <div className="flex-1 min-w-0">
                      <UserBadge user={candidate} showEmail={true} />
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {ROLES.map((role, bIndex: number) => {
                        const key = `${candidate.id}-${role.value}`;
                        const isThisPromoting = promotingKeys.has(key);
                        return (
                          <Button
                            key={role.value}
                            size="sm"
                            variant="outline"
                            className={cn(
                              ROLE_BADGES[role.value].className,
                              "text-xs h-7 transition-all",
                              activeUserIndex === uIndex && activeButtonIndex === bIndex
                                ? "ring-2 ring-ring ring-offset-1 scale-105 z-10"
                                : ""
                            )}
                            onMouseEnter={() => setActiveButtonIndex(bIndex)}
                            onClick={() => handlePromote(candidate.id, role.value)}
                            disabled={isThisPromoting}
                          >
                            {isThisPromoting && (
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            )}
                            {role.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-sm text-center text-muted-foreground">
                Юзеры не найдены
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}