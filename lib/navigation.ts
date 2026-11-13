// lib/navigation.ts
import { 
  LayoutDashboard, Users, Wallet, Crown, Gift, ShieldCheck, Megaphone, 
  ScrollText, Image, FileText, Settings, Terminal, Headset, Files, 
  MessagesSquare, ShieldBan, MessageCircle, BookOpen, Heart, Flag, 
  Siren, UserX
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  roles?: Array<'admin' | 'moderator' | 'support'>;
  badgeKey?: string; // Ключ для динамического счётчика (например 'pendingPhotos')
  badgeType?: 'default' | 'destructive' | 'pulse'; // Стиль бейджа
}

export const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "Главное",
    items: [
      { title: "Дашборд", href: "/dashboard", icon: LayoutDashboard },
      { title: "Все юзеры", href: "/users", icon: Users },
    ],
  },
  {
    label: "Финансы",
    items: [
      { title: "Транзакции", href: "/finance/transactions", icon: Wallet, roles: ['admin'] },
      { title: "Платные подписки", href: "/finance/subscription-plans", icon: Crown, roles: ['admin'] },
      { title: "Подарки", href: "/finance/gifts", icon: Gift, roles: ['admin'] },
    ],
  },
  {
    label: "Система",
    items: [
      { title: "Роли и Админы", href: "/system/roles", icon: ShieldCheck, roles: ['admin'] },
      { title: "Рассылка уведомлений", href: "/system/broadcasts", icon: Megaphone, roles: ['admin'] },
      { title: "Журнал действий", href: "/system/admin-log", icon: ScrollText, roles: ['admin'] },
      { title: "Geo IP локации", href: "/system/geoip", icon: ScrollText, roles: ['admin'] },
      { title: "Медиа", href: "/system/media", icon: Image, roles: ['admin'] },
      { title: "Блог", href: "/system/blog/posts", icon: FileText, roles: ['admin'] },
      { title: "Страницы", href: "/system/pages", icon: FileText, roles: ['admin'] },
      { title: "Настройки", href: "/system/settings", icon: Settings, roles: ['admin'] },
      { title: "Логи Системы", href: "/system/logs", icon: Terminal, roles: ['admin'] },
    ],
  },
  {
    label: "Коммуникация",
    items: [
      { title: "Чат поддержки", href: "/communication/support", icon: Headset },
      { title: "Шаблоны поддержки", href: "/communication/support-templates", icon: Files },
      { title: "Все чаты", href: "/communication/chats", icon: MessagesSquare, roles: ['admin', 'moderator'] },
      { title: "Стоп-слова", href: "/communication/stop-words", icon: ShieldBan, roles: ['admin', 'moderator'] },
    ],
  },
  {
    label: "Модерация",
    items: [
      { title: "Фотографии", href: "/moderation/photos", icon: Image, roles: ['admin', 'moderator'], badgeKey: "pendingPhotos", badgeType: "default" },
      { title: "Комм. к фото", href: "/moderation/photo-comments", icon: MessageCircle, roles: ['admin', 'moderator'], badgeKey: "pendingPhotoComments", badgeType: "default" },
      { title: "Дневники", href: "/moderation/diary", icon: BookOpen, roles: ['admin', 'moderator'], badgeKey: "pendingDiaries", badgeType: "default" },
      { title: "Комм. к дневникам", href: "/moderation/diary-comments", icon: Heart, roles: ['admin', 'moderator'], badgeKey: "pendingDiaryComments", badgeType: "default" },
      { title: "Знакомства", href: "/moderation/dating", icon: Heart, roles: ['admin', 'moderator'] },
      { title: "Жалобы", href: "/moderation/reports", icon: Flag, roles: ['admin', 'moderator'], badgeKey: "pendingReports", badgeType: "destructive" },
    ],
  },
  {
    label: "Безопасность",
    items: [
      { title: "Антифрод", href: "/security/fraud-alerts", icon: Siren, roles: ['admin', 'moderator'], badgeKey: "openFraudAlerts", badgeType: "pulse" },
      { title: "Сигналы блокировки", href: "/security/block-signals", icon: UserX, roles: ['admin', 'moderator'] },
    ],
  },
];