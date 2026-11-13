// app/(admin)/system/settings/_components/_shared.ts

import {
  Globe, Gauge, ShieldCheck, Lock, Wallet, Search, Share2, Settings2,
} from "lucide-react";

// Иконки для групп настроек.
export const GROUP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  general: Globe,
  limits: Gauge,
  moderation: ShieldCheck,
  security: Lock,
  finance: Wallet,
  seo: Search,
  social: Share2,
};

export function getGroupIcon(key: string): React.ComponentType<{ className?: string }> {
  return GROUP_ICONS[key] || Settings2;
}

export function ucfirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}