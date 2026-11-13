// app/(admin)/system/roles/_components/staff-table.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserBadge } from "@/components/admin/user-badge";
import { getRoleBadge, ROLE_BADGES } from "@/lib/role-badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { staffApi, type StaffMember, type StaffListResponse } from "@/lib/api/staff";
import { extractErrorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { Save, UserMinus, Loader2, Users, AlertCircle, RefreshCw } from "lucide-react";
import { ROLES } from "./_shared";

export function StaffTable({
  page,
  onPageChange,
  urlInitialized,
}: {
  page: number;
  onPageChange: (page: number) => void;
  urlInitialized: boolean;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedRoles, setSelectedRoles] = useState<Record<number, string>>({});

  // F2: placeholderData вместо deprecated keepPreviousData.
  const queryResult = useQuery<StaffListResponse>({
    queryKey: ["staff", page],
    queryFn: () => staffApi.getStaff(page),
    placeholderData: (prev) => prev,
  });

  const staffData = queryResult.data;
  const isLoadingStaff = queryResult.isLoading;
  const isFetchingStaff = queryResult.isFetching;
  const isError = queryResult.isError;
  const error = queryResult.error;

  // F9: per-row pending для demote.
  const [demotingIds, setDemotingIds] = useState<Set<number>>(new Set());

  // F10: URL-sync для ?page=N.
  useEffect(() => {
    if (!urlInitialized) return;
    const params = new URLSearchParams();
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }, [page, router, urlInitialized]);

  const demoteMutation = useMutation({
    mutationFn: (userId: number) => staffApi.demote(userId),
    onSuccess: (data) => {
      toast.info(data.message);
      queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (err: unknown) => {
      // F3: extractErrorMessage из lib/api.
      toast.error(extractErrorMessage(err, "Ошибка при понижении"));
    },
  });

  const batchUpdateMutation = useMutation({
    mutationFn: (roles: Record<number, string>) => staffApi.batchUpdate(roles),
    onSuccess: (data) => {
      if (data.updated_count > 0) {
        toast.success(data.message);
      } else {
        toast.info(data.message);
      }
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      // Сбрасываем выбранные роли после сохранения.
      setSelectedRoles({});
    },
    onError: (err: unknown) => {
      toast.error(extractErrorMessage(err, "Ошибка сервера при сохранении!"));
    },
  });

  const hasChanges = staffData?.data?.some((member: StaffMember) => {
    if (member.is_founder || member.is_self) return false;
    return selectedRoles[member.id] !== undefined && selectedRoles[member.id] !== member.role;
  }) ?? false;

  const isFirstLoad = isLoadingStaff && !staffData?.data;
  const showEmpty = !isLoadingStaff && !isFetchingStaff && (!staffData?.data || staffData.data.length === 0) && !isError;

  const handleDemote = (userId: number) => {
    setDemotingIds((prev) => {
      const next = new Set(prev);
      next.add(userId);
      return next;
    });
    demoteMutation.mutate(userId, {
      onSettled: () => {
        setDemotingIds((prev) => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      },
    });
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden relative">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="text-lg font-semibold">Текущий персонал</h2>
        <Button
          size="sm"
          variant={hasChanges ? "default" : "secondary"}
          onClick={() => batchUpdateMutation.mutate(selectedRoles)}
          disabled={!hasChanges || batchUpdateMutation.isPending}
        >
          {batchUpdateMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-1" />
          )}
          {hasChanges ? "Сохранить" : "Сохранено"}
        </Button>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Сотрудник</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Роль</TableHead>
              {/* B3: подпись "Дата регистрации" вместо "Дата назначения" */}
              <TableHead>Дата регистрации</TableHead>
              <TableHead className="text-right">Управление</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isFirstLoad ? (
              <TableRow>
                <TableCell colSpan={5} className="py-16">
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                </TableCell>
              </TableRow>
            ) : isError ? (
              // F5: отдельная ветка ошибки загрузки.
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="h-64 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <AlertCircle className="w-16 h-16 text-destructive/50" />
                    <div>
                      <p className="text-sm font-medium text-destructive">Не удалось загрузить сотрудников</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {extractErrorMessage(error, "Проверьте соединение с сервером")}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => queryResult.refetch()} className="mt-2">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Повторить
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : showEmpty ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="h-64 text-center text-muted-foreground animate-in fade-in duration-300">
                  <div className="flex flex-col items-center gap-3">
                    <Users className="w-16 h-16 opacity-25" />
                    <p className="text-sm font-medium">Сотрудников нет</p>
                    <p className="text-xs">Назначьте сотрудников через форму выше</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              staffData?.data?.map((member: StaffMember, index: number) => {
                const roleBadge = getRoleBadge(member.role);
                const currentRoleValue = selectedRoles[member.id] || member.role;

                return (
                  <TableRow
                    key={member.id}
                    className="animate-in fade-in slide-in-from-bottom-1 duration-300"
                    style={{
                      animationDelay: `${Math.min(index * 30, 400)}ms`,
                      animationFillMode: 'backwards',
                    }}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {/* F12: StaffMember наследует UserBadgeData — каст не нужен. */}
                        <UserBadge user={member} showEmail={false} />
                        {member.is_founder ? (
                          <Badge variant="outline" className={cn(ROLE_BADGES.admin.className, "text-xs ml-2")}>
                            Владелец
                          </Badge>
                        ) : member.is_self ? (
                          <Badge variant="secondary" className="text-xs ml-2">Вы</Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{member.email}</TableCell>
                    <TableCell>
                      {member.is_founder || member.is_self ? (
                        <Badge variant="outline" className={`text-xs pointer-events-none ${roleBadge.className}`}>
                          Супер Админ
                        </Badge>
                      ) : (
                        <Select
                          value={currentRoleValue}
                          onValueChange={(value: string | null) => {
                            if (value) {
                              setSelectedRoles((prev) => ({ ...prev, [member.id]: value }));
                            }
                          }}
                        >
                          <SelectTrigger className="w-36 h-8 text-xs">
                            <SelectValue>
                              {ROLES.find(r => r.value === currentRoleValue)?.label || "Выберите роль"}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent alignItemWithTrigger={false}>
                            {ROLES.map((role) => (
                              <SelectItem key={role.value} value={role.value} className="text-xs">
                                {role.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                      {/* F14 + B3: форматирование через formatDateTime из lib/format,
                          т.к. бэкенд теперь отдаёт ISO. */}
                      {member.created_at ? formatDateTime(member.created_at) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {member.is_founder ? (
                        <span className="text-xs text-muted-foreground">
                          Защищен
                        </span>
                      ) : !member.is_self ? (
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleDemote(member.id)}
                          disabled={demotingIds.has(member.id)}
                        >
                          {demotingIds.has(member.id) ? (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          ) : (
                            <UserMinus className="w-3 h-3 mr-1" />
                          )}
                          Уволить
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Нельзя уволить себя</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Пагинация */}
      {staffData?.last_page && staffData.last_page > 1 && (
        <div className="p-4 flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.max(page - 1, 1))}
            disabled={page === 1 || isFetchingStaff}
          >
            Назад
          </Button>
          <span className="text-sm flex items-center px-2 tabular-nums">
            Стр. {page} из {staffData?.last_page}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.min(page + 1, staffData?.last_page ?? 1))}
            disabled={page === staffData?.last_page || isFetchingStaff}
          >
            Вперёд
          </Button>
        </div>
      )}
    </div>
  );
}