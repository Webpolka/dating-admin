// app/(admin)/system/broadcasts/_components/broadcast-audience-card.tsx
"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { UserSearchInput } from "@/components/admin/user-search-input";
import { CityCombobox } from "@/components/admin/city-combobox";
import { Lock, Users } from "lucide-react";
import type { SearchUserItem } from "@/hooks/admin/use-search-users";
import type { AudienceFilters } from "./_shared";

// Мин/макс возраст для дейтинг-проекта.
export const MIN_AGE = 18;
export const MAX_AGE = 99;

// Лейблы для селектов — чтобы SelectTrigger показывал выбранное значение.
const GENDER_LABELS: Record<string, string> = {
  male: "Мужчины",
  female: "Женщины",
};
const PREMIUM_LABELS: Record<string, string> = {
  true: "Только VIP",
  false: "Без VIP",
};
const LAST_SEEN_LABELS: Record<string, string> = {
  "3": "> 3 дней",
  "7": "> 7 дней",
  "30": "> 30 дней",
};
const HAS_PHOTO_LABELS: Record<string, string> = {
  true: "С фото",
  false: "Без фото",
};

interface Props {
  selectedUser: SearchUserItem | null;
  filters: AudienceFilters;
  isLocked: boolean;
  errors: Record<string, string>;
  onSelectUser: (user: SearchUserItem) => void;
  onClearUser: () => void;
  onFilterChange: (key: keyof AudienceFilters, value: string | null) => void;
  onClearError: (field: string) => void;
}

/**
 * Карточка целевой аудитории: поиск конкретного юзера + фильтры.
 *
 * Логика возраста (age_from / age_to):
 *  - onChange: просто сохраняем значение, чистим ошибки. Никакой магии.
 *  - onBlur: автокорректировка диапазона — если from > to, подтягиваем to к from.
 *  - Валидация 18..99 — в validate() родительского компонента (при submit).
 */
export function BroadcastAudienceCard({
  selectedUser,
  filters,
  isLocked,
  errors,
  onSelectUser,
  onClearUser,
  onFilterChange,
  onClearError,
}: Props) {
  // onChange: сохраняем как есть. Разрешаем пустую строку (снимает фильтр).
  // Не делаем clamping и автокорректировку — это мешает печатать.
  const handleAgeChange = (field: "age_from" | "age_to", value: string) => {
    onFilterChange(field, value === "" ? null : value);
    onClearError("age_from");
    onClearError("age_to");
  };

  // onBlur: автокорректировка диапазона. Если from > to — подтягиваем to к from.
  // Это предсказуемо: юзер закончил ввод, мы нормализуем.
  const handleAgeBlur = () => {
    const from = filters.age_from;
    const to = filters.age_to;
    if (from && to && parseInt(from, 10) > parseInt(to, 10)) {
      // from > to → делаем to = from
      onFilterChange("age_to", from);
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-sm space-y-4">
      <h3 className="text-sm font-medium flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
        <Users className="w-4 h-4" /> Целевая аудитория
      </h3>

      {/* User search */}
      <div className="flex flex-col gap-2">
        <Label className="text-xs">Конкретный юзер (отменяет все фильтры ниже)</Label>
        <UserSearchInput
          onSelect={onSelectUser}
          selectedUser={selectedUser}
          onClear={onClearUser}
          disabled={isLocked}
        />
      </div>

      {/* Filters */}
      <div className={`${selectedUser ? "opacity-40 pointer-events-none" : ""} border-t border-border pt-4 grid grid-cols-2 gap-3 relative`}>
        {selectedUser && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <Lock className="w-24 h-24 text-muted-foreground" />
          </div>
        )}

        {/* Gender */}
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Пол</Label>
          <Select
            value={filters.gender ?? ""}
            onValueChange={(v: string | null) => onFilterChange("gender", v)}
          >
            <SelectTrigger disabled={isLocked}>
              {filters.gender ? GENDER_LABELS[filters.gender] ?? "Все" : "Все"}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Все</SelectItem>
              <SelectItem value="male">Мужчины</SelectItem>
              <SelectItem value="female">Женщины</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* VIP */}
        <div className="flex flex-col gap-1">
          <Label className="text-xs">VIP статус</Label>
          <Select
            value={filters.is_premium ?? ""}
            onValueChange={(v: string | null) => onFilterChange("is_premium", v)}
          >
            <SelectTrigger disabled={isLocked}>
              {filters.is_premium ? PREMIUM_LABELS[filters.is_premium] ?? "Все" : "Все"}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Все</SelectItem>
              <SelectItem value="true">Только VIP</SelectItem>
              <SelectItem value="false">Без VIP</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* City */}
        <div className="flex flex-col gap-1 col-span-2">
          <Label className="text-xs">Город</Label>
          <CityCombobox
            value={{ id: filters.city_id ?? "", type: "city", label: filters.city_label ?? ""}}
            onChange={(val) => {
              onFilterChange("city_id", val.id);
              onFilterChange("city_label", val.label);
            }}
            disabled={isLocked || !!selectedUser}
          />
        </div>

        {/* Age */}
        <div className="flex flex-col gap-1 col-span-2">
          <Label className="text-xs">Возраст ({MIN_AGE}–{MAX_AGE})</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={filters.age_from ?? ""}
              onChange={(e) => handleAgeChange("age_from", e.target.value)}
              onBlur={handleAgeBlur}
              placeholder="От"
              min={MIN_AGE}
              max={MAX_AGE}
              disabled={isLocked}
              className={errors.age_from ? "border-destructive" : ""}
            />
            <span className="text-muted-foreground">—</span>
            <Input
              type="number"
              value={filters.age_to ?? ""}
              onChange={(e) => handleAgeChange("age_to", e.target.value)}
              onBlur={handleAgeBlur}
              placeholder="До"
              min={MIN_AGE}
              max={MAX_AGE}
              disabled={isLocked}
              className={errors.age_to ? "border-destructive" : ""}
            />
          </div>
          {errors.age_from && <p className="text-xs text-destructive">{errors.age_from}</p>}
          {!errors.age_from && errors.age_to && <p className="text-xs text-destructive">{errors.age_to}</p>}
        </div>

        {/* Last seen */}
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Не заходили</Label>
          <Select
            value={filters.last_seen_days ?? ""}
            onValueChange={(v: string | null) => onFilterChange("last_seen_days", v)}
          >
            <SelectTrigger disabled={isLocked}>
              {filters.last_seen_days ? LAST_SEEN_LABELS[filters.last_seen_days] ?? "Любая" : "Любая"}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Любая</SelectItem>
              <SelectItem value="3">{">"} 3 дней</SelectItem>
              <SelectItem value="7">{">"} 7 дней</SelectItem>
              <SelectItem value="30">{">"} 30 дней</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Has photo */}
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Наличие фото</Label>
          <Select
            value={filters.has_photo ?? ""}
            onValueChange={(v: string | null) => onFilterChange("has_photo", v)}
          >
            <SelectTrigger disabled={isLocked}>
              {filters.has_photo ? HAS_PHOTO_LABELS[filters.has_photo] ?? "Любое" : "Любое"}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Любое</SelectItem>
              <SelectItem value="true">С фото</SelectItem>
              <SelectItem value="false">Без фото</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}