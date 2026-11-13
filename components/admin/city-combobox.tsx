// components/admin/city-combobox.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import { Check, ChevronsUpDown, MapPin, X } from "lucide-react";

interface GeoResult {
  id: number;
  type: "city" | "country";
  label: string;
}

interface CityComboboxProps {
  value: { id: string; type: string; label: string };
  onChange: (value: { id: string; type: string; label: string }) => void;
  disabled?: boolean;
  className?: string;
}

export function CityCombobox({
  value,
  onChange,
  disabled = false,
  className,
}: CityComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [loading, setLoading] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const [dropdownWidth, setDropdownWidth] = useState(0);

  useEffect(() => {
    if (open && triggerRef.current) {
      setDropdownWidth(triggerRef.current.offsetWidth);
    }
  }, [open]);

  useEffect(() => {
    if (!search || search.length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      return;
    }

    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const res = await api.get<GeoResult[]>("/geo/search", {
          params: { q: search },
        });
        setResults(res.data);
      } catch (error) {
        console.error("Ошибка поиска города:", error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="relative w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          ref={triggerRef}
          disabled={disabled}
          className={cn(
            "inline-flex items-center justify-between w-full rounded-lg border border-input bg-secondary px-4 py-2 text-sm font-normal placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer",
            className
          )}
        >
          <div className="flex items-center gap-2 truncate">
            {value.label ? (
              <>
                <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="truncate">{value.label}</span>
              </>
            ) : (
              <span className="text-muted-foreground">Выберите город</span>
            )}
          </div>
          
          <div className="flex items-center gap-1 ml-2 shrink-0">
            {value.label && !disabled ? (
              <span
                className="text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange({ id: "", type: "", label: "" });
                }}
              >
                <X className="w-4 h-4" />
              </span>
            ) : null}
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </div>
        </PopoverTrigger>
        
        <PopoverContent style={{ width: dropdownWidth }} className="p-0">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Начните вводить..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              {loading && <div className="p-2 text-sm text-center text-muted-foreground">Поиск...</div>}
              {!loading && search.length >= 2 && results.length === 0 && (
                <CommandEmpty>Ничего не найдено.</CommandEmpty>
              )}
              {!loading && results.length > 0 && (
                <CommandGroup>
                  {results.map((item) => (
                    <CommandItem
                      key={`${item.type}-${item.id}`}
                      onSelect={() => {
                        onChange({ id: String(item.id), type: item.type, label: item.label });
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value.id === String(item.id) ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {item.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}