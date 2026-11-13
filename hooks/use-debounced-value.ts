"use client";

// hooks/use-debounced-value.ts
//
// Debounce значения (обычно строки поиска).
//
// Заменяет копипасту «useState + useEffect + setTimeout + clearTimeout»,
// которая раньше повторялась в каждом списочном компоненте.
//
// Особенность: пустая строка проходит БЕЗ задержки. Сброс поиска
// (крестик, «Сбросить фильтры») не должен ждать 400мс — список
// должен обновиться мгновенно. Раньше это делали ручным
// setDebouncedSearch("") рядом с setSearch("") — теперь хук сам.

import { useEffect, useState } from "react";

/**
 * Возвращает value, обновлённое не чаще, чем раз в delayMs.
 *
 * @param value    исходное значение (например, строка поиска)
 * @param delayMs  задержка в мс (SEARCH_DEBOUNCE_MS из lib/constants)
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    // Сброс (пустая строка) применяем мгновенно — без таймера.
    // set-state-in-effect тут легитимно: это debounce-хук, синхронизация
    // значения с задержкой — его единственная ответственность (тот же
    // паттерн, что в use-mobile.ts и списочных страницах проекта).
    if (value === "") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDebounced(value);
      return;
    }
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
