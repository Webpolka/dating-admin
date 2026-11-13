// app/not-found.tsx
import Link from "next/link";
import { Compass, Home } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4 text-center">
      <div className="mx-auto flex max-w-md flex-col items-center gap-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
          <Compass className="h-10 w-10 text-muted-foreground" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">404</h1>
          <h2 className="text-xl font-semibold">Страница не найдена</h2>
          <p className="text-sm text-muted-foreground">
            Кажется, вы забрели не в ту панель. Страница, которую вы ищете, не существует или была перемещена.
          </p>
        </div>

        <Link href="/dashboard" className={buttonVariants({ variant: "default" })}>
          <Home className="mr-2 h-4 w-4" />
          Вернуться на дашборд
        </Link>
      </div>
    </div>
  );
}