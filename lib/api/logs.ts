// lib/api/logs.ts
import api from "@/lib/api";

export interface LogEntry {
  timestamp: string;
  environment: string;
  level: string;
  message: string;
  trace: string;
  full: string;
  level_color: string;
}

export interface LogStats {
  total_entries: number;
  levels: Record<string, number>;
}

export interface LogsApiResponse {
  logs: {
    data: LogEntry[];
    total: number;
    last_page: number;
    current_page: number;
  };
  log_size: string;
  stats: {
    total_entries: number;
    levels: Record<string, number>;
  };
}


export const logsApi = {
  get: async (params: {
    page: number;
    level: string;
    search: string;
    date: string;
  }): Promise<LogsApiResponse> => {
    const { data } = await api.get('/admin/system/logs', { params });
    return data;
  },
  clear: async () => {
    const { data } = await api.post('/admin/system/logs/clear');
    return data;
  },
};