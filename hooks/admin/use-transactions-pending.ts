// hooks/admin/use-transactions-pending.ts
//
// Глобальный стор "в процессе" для sync/refund транзакций.
//
// Проблема, которую решает:
//   Раньше спиннер на sync/refund крутился только пока POST /admin/transactions/{id}/sync
//   не вернёт 200 — а это быстро (backend только dispatch'ит Job в очередь).
//   После ответа POST спиннер пропадал, но реально процесс ещё шёл 5-30 секунд
//   (Job идёт в банк, банк отвечает, broadcast'ится WebSocket). Админ не понимал,
//   что происходит в эти 5-30 секунд.
//
// Теперь:
//   - markSyncPending(id) вызывается ПЕРЕД POST в useSyncTransaction.mutationFn
//   - clearSyncPending(id) вызывается в WebSocket listener'е при .sync.processed
//   - clearSyncPending(id) также вызывается в onError мутации (POST упал)
//   - Авто-сброс через 60 сек (если WebSocket не пришёл — Job завис или Reverb лежит)
//
// UI читает syncIds.has(tx.id) — если true, спиннер крутится.
// Это позволяет видеть "процесс идёт" всё время, пока банк не ответил.

import { create } from "zustand";

type PendingState = {
  syncIds: Set<number>;
  refundIds: Set<number>;
  markSyncPending: (id: number) => void;
  markRefundPending: (id: number) => void;
  clearSyncPending: (id: number) => void;
  clearRefundPending: (id: number) => void;
};

// Вне store храним таймеры авто-сброса, чтобы не плодить ре-рендеры.
// Map<id, timeoutId> — по id транзакции.
const syncTimeouts = new Map<number, ReturnType<typeof setTimeout>>();
const refundTimeouts = new Map<number, ReturnType<typeof setTimeout>>();

// 60 секунд — потолок для ожидания ответа банка. Если за 60 сек WebSocket
// не пришёл — что-то не так (Job упал, Reverb лежит, банк молчит).
// Сбрасываем pending, чтобы спиннер не крутился вечно.
const AUTO_RESET_MS = 60_000;

export const useTransactionPending = create<PendingState>((set, get) => ({
  syncIds: new Set(),
  refundIds: new Set(),

  markSyncPending: (id) => {
    set((s) => {
      const next = new Set(s.syncIds);
      next.add(id);
      return { syncIds: next };
    });

    // Сбрасываем предыдущий таймер (если был) и ставим новый.
    const prevTimeout = syncTimeouts.get(id);
    if (prevTimeout) clearTimeout(prevTimeout);
    const t = setTimeout(() => {
      get().clearSyncPending(id);
      console.warn(`[transaction-pending] sync #${id}: auto-reset after ${AUTO_RESET_MS}ms (no WebSocket event)`);
    }, AUTO_RESET_MS);
    syncTimeouts.set(id, t);
  },

  markRefundPending: (id) => {
    set((s) => {
      const next = new Set(s.refundIds);
      next.add(id);
      return { refundIds: next };
    });

    const prevTimeout = refundTimeouts.get(id);
    if (prevTimeout) clearTimeout(prevTimeout);
    const t = setTimeout(() => {
      get().clearRefundPending(id);
      console.warn(`[transaction-pending] refund #${id}: auto-reset after ${AUTO_RESET_MS}ms (no WebSocket event)`);
    }, AUTO_RESET_MS);
    refundTimeouts.set(id, t);
  },

  clearSyncPending: (id) => {
    const prevTimeout = syncTimeouts.get(id);
    if (prevTimeout) {
      clearTimeout(prevTimeout);
      syncTimeouts.delete(id);
    }
    set((s) => {
      if (!s.syncIds.has(id)) return s; // не было — нечего удалять, пропускаем ре-рендер
      const next = new Set(s.syncIds);
      next.delete(id);
      return { syncIds: next };
    });
  },

  clearRefundPending: (id) => {
    const prevTimeout = refundTimeouts.get(id);
    if (prevTimeout) {
      clearTimeout(prevTimeout);
      refundTimeouts.delete(id);
    }
    set((s) => {
      if (!s.refundIds.has(id)) return s;
      const next = new Set(s.refundIds);
      next.delete(id);
      return { refundIds: next };
    });
  },
}));