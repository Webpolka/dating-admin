// app/(admin)/error.tsx
"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCw } from "lucide-react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin-error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="w-full max-w-md bg-card rounded-lg border border-border shadow-sm p-8 space-y-4 text-center">
        <div className="w-14 h-14 mx-auto bg-destructive/10 rounded-full flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-destructive" />
        </div>
        <h1 className="text-xl font-semibold text-foreground">
          Что-то пошло не так
        </h1>
        <p className="text-sm text-muted-foreground">
          Сервер недоступен или произошла ошибка. Попробуйте обновить страницу.
          Если проблема повторяется — обратитесь к администратору.
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground font-mono">
            ID: {error.digest}
          </p>
        )}
        <Button onClick={reset} className="w-full">
          <RotateCw className="w-4 h-4 mr-2" />
          Попробовать снова
        </Button>
      </div>
    </div>
  );
}