// app/(admin)/system/settings/_components/setting-row.tsx
"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { SettingItem, SettingValue } from "@/lib/api/settings";

interface Props {
  setting: SettingItem;
  index: number;
  onInputChange: (id: number, value: SettingValue) => void;
  error?: string;
}
/**
 * Одна строка настройки (label + input).
 * Вынесено из settings-page-client.tsx для читаемости.
 */
export function SettingRow({ setting, index, onInputChange, error }: Props) {
  return (
    <div
      className="flex items-start gap-4 p-4 bg-muted/10 rounded-lg border border-border hover:border-primary/30 transition-colors animate-in fade-in slide-in-from-bottom-1 duration-300"
      style={{
        animationDelay: `${Math.min(index * 30, 300)}ms`,
        animationFillMode: 'backwards',
      }}
    >
      <div className="flex-1 pt-1">
        <label className="block text-sm font-medium text-foreground">
          {setting.label || setting.key}
          {setting.is_public && (
            <Badge variant="outline" className="ml-2 text-green-500 border-green-500/30 text-xs">API</Badge>
          )}
        </label>
        {setting.description && (
          <p className="text-xs text-muted-foreground mt-1">{setting.description}</p>
        )}
        <p className="text-xs text-muted-foreground mt-1 opacity-70">
          Ключ: <code className="px-1 py-0.5 bg-muted rounded text-[10px]">{setting.key}</code>
        </p>
      </div>

      <div className="w-80">
        {setting.type === 'boolean' && (
          <div className="flex items-center pt-2">
            <Checkbox
              id={`setting-${setting.id}`}
              checked={!!setting.value}
              onCheckedChange={(checked) => onInputChange(setting.id, checked)}
            />
            <label htmlFor={`setting-${setting.id}`} className="ml-2 text-sm cursor-pointer">
              {setting.value ? 'Включено' : 'Выключено'}
            </label>
          </div>
        )}

        {setting.type === 'select' && (
          <Select
            value={String(setting.value)}
            onValueChange={(val: string | null) => {
              if (val !== null) {
                onInputChange(setting.id, val);
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Выберите..." />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(setting.options || {}).map(([val, label]) => (
                <SelectItem key={val} value={val}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {setting.type === 'textarea' && (
          <Textarea
            value={String(setting.value || '')}
            onChange={(e) => onInputChange(setting.id, e.target.value)}
            rows={3}
          />
        )}

        {setting.type === 'json' && (
          <Textarea
            value={String(setting.value || '')}
            onChange={(e) => onInputChange(setting.id, e.target.value)}
            rows={4}
            className="font-mono text-xs"
            placeholder="JSON массив..."
          />
        )}

        {setting.type === 'integer' && (
          <div className="flex flex-col gap-1">
            <Input
              type="number"
              min={0}
              value={Number(setting.value || 0)}
              onChange={(e) => onInputChange(setting.id, e.target.value)}
              className={error ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}
          </div>
        )}

        {setting.type === 'text' && (
          <Input
            type="text"
            value={String(setting.value || '')}
            onChange={(e) => onInputChange(setting.id, e.target.value)}
          />
        )}
      </div>
    </div>
  );
}