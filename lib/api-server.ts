// lib/api-server.ts
// ТОЛЬКО для серверных компонентов (лейауты/страницы).
// В client-компонентах НЕ импортировать — там обычный `api` из lib/api.ts!
import axios from "axios";

// Читаем СУЩЕСТВУЮЩУЮ server-only переменную из .env.local
const API_URL = (process.env.API_URL_INTERNAL ?? "http://localhost:8000").replace(/\/+$/, "");

export const apiServer = axios.create({
  baseURL: `${API_URL}/api/admin`,
  timeout: 5000, // API лежит → catch в лейауте → чистый редирект, а не висяк
  headers: {
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
  // withCredentials убрали — на сервере он бессмысленный,
  // куку лейаут пробрасывает руками через header Cookie
});