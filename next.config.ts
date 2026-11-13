import type { NextConfig } from "next";

// Адрес Laravel. Читается ОДИН раз при старте — после правки .env.local
// нужен перезапуск дев-сервера. Хвостовые слэши обрезаем.
const API_URL = (process.env.API_URL_INTERNAL ?? "http://localhost:8000").replace(
  /\/+$/,
  "",
);

const nextConfig: NextConfig = {
  // Ускоряет переходы по сайдбару (префетч RSC-пейлоадов)
  // partialPrefetching: true,
  // cacheComponents: true,
  // experimental: {
  //   agentFeedback: true,
  // },

  // Tailwind v4 БЕЗ postcss.config (его нет, и @tailwindcss/postcss не стоит) —
  // всю обработку CSS делает этот лоадер. Убрал правило → голый UI.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },

  async rewrites() {
  return [
    // Сердце связки Next ↔ Laravel (доказано curl-тестами)
    { source: "/api/:path*", destination: `${API_URL}/api/:path*` },
    { source: "/sanctum/:path*", destination: `${API_URL}/sanctum/:path*` },
    { source: "/storage/:path*", destination: `${API_URL}/storage/:path*` },
    // Reverb broadcasting auth — для приватных каналов (admin.transactions и т.д.)
    { source: "/broadcasting/:path*", destination: `${API_URL}/broadcasting/:path*` },
  ];
},
};

export default nextConfig;