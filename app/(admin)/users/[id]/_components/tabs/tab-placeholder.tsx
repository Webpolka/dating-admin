"use client";

import { Construction } from "lucide-react";

interface TabPlaceholderProps {
  title: string;
  description?: string;
}

export function TabPlaceholder({ title, description }: TabPlaceholderProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Construction className="w-12 h-12 text-muted-foreground/40 mb-3" />
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        {description ?? "Этот раздел в разработке. Скоро будет доступен."}
      </p>
    </div>
  );
}