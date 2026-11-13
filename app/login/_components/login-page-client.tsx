// app/login/_components/login-page-client.tsx
"use client";

import { useState, FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, ShieldCheck, Eye, EyeOff } from "lucide-react";
import axios from "axios"; // ← обычный axios для CSRF запроса
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
} from "@/components/ui/input-group";
import api, { isValidationError, isApiError, isNetworkError } from "@/lib/api";

export function LoginPageClient() {
  const searchParams = useSearchParams();
  const fromPath = searchParams.get("from") || "/dashboard";

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // 1. Получаем CSRF cookie от Sanctum (отдельный axios, без baseURL)
      await axios.get("/sanctum/csrf-cookie", {
        withCredentials: true,
      });

      // 2. Логинимся через основной api instance
      await api.post("/admin/login", {
        email,
        password,
      });

      // 3. Hard redirect на запрошенную страницу.
      //    Никакого setTimeout — браузер применит Set-Cookie из ответа
      //    синхронно перед навигацией. Если сессия не валидна — server
      //    layout сделает /me, получит 401 и вернёт на /login (нормальный flow).
      window.location.href = fromPath;
    } catch (err: unknown) {
      if (isValidationError(err)) {
        // 422 — неверный пароль / нет такого email / не staff / забанен
        const messages = Object.values(err.response?.data?.errors || {}).flat();
        setError(messages[0] || "Неверный email или пароль.");
      } else if (isApiError(err)) {
        // 429 (throttle), 500 и т.д. — есть ответ от сервера
        setError(err.response?.data?.message || "Ошибка сервера. Попробуйте позже.");
      } else if (isNetworkError(err)) {
        // Сетевая ошибка / бэкенд лежит / CORS — нет ответа вообще
        setError("Не удалось connect к серверу. Проверьте подключение.");
      } else {
        setError("Произошла неизвестная ошибка.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
      <div className="w-full max-w-sm bg-card rounded-lg border border-border shadow-sm p-6 space-y-6">
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">
            Панель управления
          </h1>
          <p className="text-xs text-muted-foreground">
            Войдите как администратор или модератор
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@admin.com"
              required
              disabled={isLoading}
              autoComplete="email"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Пароль</Label>
            <InputGroup>
              <InputGroupInput
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={isLoading}
                autoComplete="current-password"
                className="pr-10"
              />
              <InputGroupAddon align="inline-end">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-muted-foreground hover:text-foreground transition-colors absolute inset-y-0 right-0 flex items-center pr-3"
                  aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </InputGroupAddon>
            </InputGroup>
          </div>

          {error && (
            <p className="text-sm text-destructive text-center bg-destructive/10 p-2 rounded-md border border-destructive/20">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || !email || !password}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Вход...
              </>
            ) : (
              "Войти"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}