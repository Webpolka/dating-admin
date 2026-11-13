// app/(admin)/system/media/_components/media-collection-button.tsx
"use client";

import { Button } from "@/components/ui/button";

export function MediaCollectionButton({
  label,
  count,
  isActive,
  onClick,
}: {
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant={isActive ? "default" : "outline"}
      size="sm"
      onClick={onClick}
      className="gap-1.5"
    >
      <span>{label}</span>
      <span className={`inline-flex items-center justify-center min-w-5 h-5 px-1 text-xs font-medium tabular-nums rounded-sm ${
        isActive ? "bg-primary-foreground/20" : "bg-background/40"
      } ${count === 0 ? "opacity-40" : ""}`}>
        {count}
      </span>
    </Button>
  );
}