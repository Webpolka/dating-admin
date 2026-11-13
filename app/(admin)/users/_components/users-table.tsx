"use client";

// app/(admin)/users/_components/users-table.tsx
//
// Таблица списка пользователей. Чистая презентация: все данные и хендлеры
// приходят пропсами из users-page-client (нет своих запросов/мутаций).

import Link from "next/link";
import { ChevronDown, ChevronUp, Eye, EyeOff, Clock, Lock, Unlock, RotateCcw, Trash2, MoreHorizontal, Users } from "lucide-react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { UserBadge } from "@/components/admin/user-badge";
import { getStatusBadge, USER_STATUS } from "@/config/status-badges";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AdminUserListItem, BanType } from "@/lib/api/users";

interface UsersTableProps {
  users: AdminUserListItem[];
  isLoading: boolean;
  isFetching: boolean;
  canManage: boolean;
  sort: "asc" | "desc";
  highlightId: number | null;
  hasFilters: boolean;
  onResetFilters: () => void;
  onToggleSort: () => void;
  onBan: (user: AdminUserListItem, type: BanType) => void;
  onUnban: (user: AdminUserListItem) => void;
  onDeactivate: (user: AdminUserListItem) => void;
  onRestore: (user: AdminUserListItem) => void;
}

export function UsersTable({
  users, isLoading, isFetching, canManage, sort, highlightId, hasFilters,
  onResetFilters, onToggleSort, onBan, onUnban, onDeactivate, onRestore,
}: UsersTableProps) {
  const colCount = canManage ? 7 : 6;

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-14">ID</TableHead>
            <TableHead>Пользователь</TableHead>
            <TableHead className="w-14">Пол</TableHead>
            <TableHead>Локация</TableHead>
            <TableHead>
              <button onClick={onToggleSort} className="flex items-center gap-1 hover:text-foreground transition-colors">
                Дата
                {sort === "desc" ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
              </button>
            </TableHead>
            <TableHead>Статус</TableHead>
            {canManage && <TableHead className="w-10 text-right"><span className="sr-only">Действия</span></TableHead>}
          </TableRow>
        </TableHeader>

        <TableBody className={cn(isFetching && !isLoading && "opacity-60 pointer-events-none transition-opacity")}>
          {/* Скелетоны при первой загрузке */}
          {isLoading && Array.from({ length: 8 }).map((_, i) => (
            <TableRow key={i}>
              {Array.from({ length: colCount }).map((_, j) => (
                <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
              ))}
            </TableRow>
          ))}

          {/* Пустой результат */}
          {!isLoading && users.length === 0 && (
            <TableRow>
              <TableCell colSpan={colCount} className="py-12 text-center text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                  <Users className="w-12 h-12 opacity-30" />
                  <p>Пользователи не найдены</p>
                  {hasFilters && (
                    <Button variant="outline" size="sm" onClick={onResetFilters} className="mt-2">
                      Сбросить фильтры
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          )}

          {/* Строки */}
          {!isLoading && users.map((user) => {
            const isDeleted = !!user.deleted_at;
            const isBanned = user.status === "banned" || user.status === "shadowbanned";
            const badge = isDeleted
              ? { variant: "secondary" as const, label: "Удалён" }
              : getStatusBadge(USER_STATUS, user.status);

            return (
              <TableRow
                key={user.id}
                className={cn(
                  user.id === highlightId
                    ? "bg-blue-50 dark:bg-blue-950/40"
                    : user.status !== "active" && "opacity-60 bg-muted/30",
                )}
              >
                <TableCell className="text-muted-foreground text-xs">#{user.id}</TableCell>

                <TableCell>
                  <Link href={`/users/${user.id}`} className="block">
                    <UserBadge user={user} />
                  </Link>
                </TableCell>

                <TableCell className="text-xs">
                  {user.gender === "male" ? <span className="text-blue-500">М</span>
                    : user.gender === "female" ? <span className="text-pink-500">Ж</span> : "—"}
                </TableCell>

                <TableCell className="text-xs">
                  <div className="font-medium">{user.city ?? "—"}</div>
                  {(user.state || user.country) && (
                    <div className="text-muted-foreground">
                      {user.state}{user.state && user.country ? ", " : ""}{user.country}
                    </div>
                  )}
                </TableCell>

                <TableCell className="text-xs text-muted-foreground whitespace-nowrap align-top pt-3">
                  {formatDateTime(user.created_at)}
                  {user.last_seen && (
                    <div className="text-[10px] text-amber-600 dark:text-amber-500 mt-0.5">
                      ↻ {formatDateTime(user.last_seen)}
                    </div>
                  )}
                </TableCell>

                <TableCell>
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                </TableCell>

                {/* Меню действий — только для admin/moderator */}
                {canManage && (
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger render={
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      }/>
                      <DropdownMenuContent align="end" className="w-46">
                        {isDeleted ? (
                          <DropdownMenuGroup>
                            <DropdownMenuLabel>Аккаунт удалён</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onRestore(user)}>
                              <RotateCcw className="w-4 h-4 text-green-500" /> Восстановить
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                        ) : (
                          <>
                            <DropdownMenuItem render={
                              <Link href={`/users/${user.id}`}><Eye className="w-4 h-4" /> Просмотр</Link>
                            }/>
                            <DropdownMenuSeparator />
                            {isBanned ? (
                              <DropdownMenuItem onClick={() => onUnban(user)}>
                                <Unlock className="w-4 h-4 text-green-500" /> Разбанить
                              </DropdownMenuItem>
                            ) : (
                              <>
                                <DropdownMenuItem onClick={() => onBan(user, "shadow")}>
                                  <EyeOff className="w-4 h-4 text-purple-500" /> Теневой бан...
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onBan(user, "temp")}>
                                  <Clock className="w-4 h-4 text-yellow-500" /> Временный бан...
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onBan(user, "permanent")}>
                                  <Lock className="w-4 h-4 text-red-500" /> Вечный бан...
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => onDeactivate(user)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" /> Деактивировать...
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}