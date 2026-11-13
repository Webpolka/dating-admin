"use client";

// app/(admin)/users/[id]/_components/clear-field-button.tsx
//
// Кнопка очистки текстового поля анкеты (заголовок / о себе / кого ищу).
// Подтверждение — через стандартный ConfirmDialog
// (раньше был window.confirm, который не стилизуется и выглядит чужеродно).

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { useClearProfileField } from "@/hooks/admin/use-users";
import type { ProfileField } from "@/lib/api/users";

interface ClearFieldButtonProps {
  userId: number;
  field: ProfileField;
  label: string;
  confirmText: string;
}

export function ClearFieldButton({
  userId,
  field,
  label,
  confirmText,
}: ClearFieldButtonProps) {
  const clear = useClearProfileField();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setConfirmOpen(true)}
        disabled={clear.isPending}
        className="text-red-500 hover:text-red-400 gap-1 h-6 px-2 text-xs"
      >
        <Trash2 className="w-3 h-3" /> {label}
      </Button>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Очистить поле?"
        description={confirmText}
        confirmText="Очистить"
        variant="destructive"
        isLoading={clear.isPending}
        onConfirm={() =>
          clear.mutate(
            { userId, field },
            { onSettled: () => setConfirmOpen(false) },
          )
        }
      />
    </>
  );
}
