"use client";

import { createContext, useContext } from "react";
import type { AdminUser } from "@/lib/types";

// Единственный источник юзера на клиенте. Наполняется в AdminShell
// из серверного лейаута (apiServer /me), читается через useAdminUser().
export const AdminUserContext = createContext<AdminUser | null>(null);

export function useAdminUser(): AdminUser | null {
  return useContext(AdminUserContext);
}