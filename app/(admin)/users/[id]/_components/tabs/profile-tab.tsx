"use client";

import {
  MessageSquare,
  User as UserIcon,
  Eye,
  HeartHandshake,
  Brush,
  Briefcase,
  Star,
  Languages,
  ShieldCheck,
  Server,
  Search,
  EyeOff,
  MessageCircle,
  Shield,
  Crown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  getOptionLabel,
  getArrayLabels,
  getGenderLabel,
  getZodiacLabel,
  getDatingGoals,
  getSearchFilterLabels,
} from "@/lib/profile-fields";
import { useUserDetail } from "@/hooks/admin/use-users";
import { TabLoading, TabError } from "@/components/admin/tab-states";
import { ClearFieldButton } from "../clear-field-button";

interface ProfileTabProps {
  userId: number;
}

export function ProfileTab({ userId }: ProfileTabProps) {
  const { data: user, isLoading, isError, refetch } = useUserDetail(userId);

  // Раньше было `if (isLoading || !user) return "Загрузка..."`.
  // При isError запроса isLoading=false, data=undefined → таб зависал
  // в «Загрузка анкеты...» вечно без шанса на retry. Теперь:
  //   isLoading → TabLoading
  //   isError   → TabError с кнопкой "Повторить"
  if (isLoading) return <TabLoading label="Загрузка анкеты…" />;
  if (isError) {
    return (
      <TabError
        label="Не удалось загрузить анкету"
        onRetry={() => refetch()}
      />
    );
  }
  if (!user) return <TabLoading label="Загрузка анкеты…" />;

  const profile = user.profile;
  const prefs = user.preferences;
  const datingGoals = getDatingGoals(profile?.dating_goals);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* ЛЕВАЯ КОЛОНКА */}
      <div className="space-y-4">
        {/* Тексты анкеты */}
        <Section icon={MessageSquare} title="Тексты анкеты">
          <div className="divide-y divide-border/50">
            <ProfileTextRow
              userId={user.id}
              field="headline"
              label="Заголовок"
              value={profile?.headline}
              confirmText="Очистить заголовок? Юзеру уйдет уведомление."
            />
            <ProfileTextRow
              userId={user.id}
              field="bio"
              label="О себе"
              value={profile?.bio}
              confirmText="Очистить поле 'О себе'? Юзеру уйдет уведомление."
            />
            <ProfileTextRow
              userId={user.id}
              field="looking_for"
              label="Кого я ищу"
              value={profile?.looking_for}
              confirmText="Очистить поле 'Кого я ищу'? Юзеру уйдет уведомление."
            />
          </div>
        </Section>

        {/* Основная информация */}
        <Section icon={UserIcon} title="Основная информация">
          <div className="divide-y divide-border/50">
            <InfoRow label="Пол" value={
              profile?.gender === "male" ? "Мужской"
              : profile?.gender === "female" ? "Женский"
              : "Не указан"
            } />
            <InfoRow label="Возраст" value={profile?.age ? `${profile.age} лет` : "Не указан"} />
            <InfoRow label="Дата рождения" value={profile?.birth_date
              ? new Date(profile.birth_date).toLocaleDateString("ru-RU")
              : "—"
            } />
            <InfoRow label="Страна" value={profile?.country ?? "Не указана"} />
            <InfoRow label="Регион" value={profile?.state ?? "Не указан"} />
            <InfoRow label="Город" value={profile?.city ?? "Не указан"} />

            {/* Цели знакомства — массив → бейджи */}
            <InfoRow label="Цели знакомства" value={
              datingGoals.length > 0 ? (
                <div className="flex flex-wrap gap-1 justify-end">
                  {datingGoals.map((g) => (
                    <span
                      key={g.value}
                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${g.color}`}
                    >
                      {g.label}
                    </span>
                  ))}
                </div>
              ) : "Не указаны"
            } />

            <InfoRow label="Знак зодиака" value={getZodiacLabel(profile?.zodiac_sign)} />
          </div>
        </Section>

        {/* Внешность */}
        <Section icon={Eye} title="Внешность">
          <div className="divide-y divide-border/50">
            <InfoRow label="Телосложение" value={getOptionLabel("body_type", profile?.body_type)} />
            <InfoRow label="Цвет глаз" value={getOptionLabel("eye_color", profile?.eye_color)} />
            <InfoRow label="Цвет волос" value={getOptionLabel("hair_color", profile?.hair_color)} />
            <InfoRow label="Рост / Вес" value={
              <>
                {profile?.height ? `${profile.height} см` : "—"} / {profile?.weight ? `${profile.weight} кг` : "—"}
              </>
            } />
            <InfoRow label="Украшения / Особенности" value={
              <div className="flex flex-wrap gap-1 justify-end max-w-[60%]">
                {getArrayLabels("body_decorations", profile?.body_decorations).map((label, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px]">{label}</Badge>
                ))}
                {(!profile?.body_decorations || profile.body_decorations.length === 0) && "Нет"}
              </div>
            } />
          </div>
        </Section>

        {/* Личная жизнь и привычки */}
        <Section icon={HeartHandshake} title="Личная жизнь и привычки">
          <div className="divide-y divide-border/50">
            <InfoRow label="Семейное положение" value={getOptionLabel("relationship_status", profile?.relationship_status)} />
            <InfoRow label="Дети" value={getOptionLabel("children_status", profile?.children_status)} />
            <InfoRow label="Домашние животные" value={getOptionLabel("pets", profile?.pets)} />
            <InfoRow label="Жилье" value={getOptionLabel("housing", profile?.housing)} />
            <InfoRow label="Автомобиль" value={getOptionLabel("has_car", profile?.has_car)} />
            <InfoRow label="Курение" value={getOptionLabel("smoking", profile?.smoking)} />
            <InfoRow label="Алкоголь" value={getOptionLabel("alcohol", profile?.alcohol)} />
          </div>
        </Section>

        {/* Автопортрет */}
        {profile?.self_portrait && Object.keys(profile.self_portrait).length > 0 && (
          <Section icon={Brush} title="Автопортрет">
            <div className="space-y-2">
              {Object.entries(profile.self_portrait).map(([key, value]) => (
                <div key={key}>
                  <span className="text-xs text-muted-foreground capitalize">
                    {key.replace(/_/g, " ")}
                  </span>
                  <p className="text-sm font-medium">{value}</p>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>

      {/* ПРАВАЯ КОЛОНКА */}
      <div className="space-y-4">
        {/* Работа и образование */}
        <Section icon={Briefcase} title="Работа и образование">
          <div className="divide-y divide-border/50">
            <InfoRow label="Образование" value={getOptionLabel("education_level", profile?.education_level)} />
            <InfoRow label="С мат. положением" value={getOptionLabel("income", profile?.income)} />
            <InfoRow label="Учебное заведение" value={profile?.institution ?? "—"} />
            <InfoRow label="Год выпуска" value={profile?.institution_year ?? "—"} />
            <InfoRow label="Сфера деятельности" value={profile?.activity ?? "—"} />
            <InfoRow label="Должность" value={profile?.position ?? "—"} />
          </div>
        </Section>

        {/* Интересы */}
        <Section icon={Star} title="Интересы">
          <div className="flex flex-wrap gap-1.5">
            {getArrayLabels("sports", profile?.sports).map((label, i) => (
              <Badge key={`sport-${i}`} variant="default" className="text-[10px]">{label}</Badge>
            ))}
           {profile?.interests?.map((interest) => (
              <Badge
                key={`interest-${interest.id ?? interest.slug}`}
                variant="secondary"
                className="text-[10px]"
              >
                {interest.name}
              </Badge>
            ))}
            {(!profile?.sports?.length && !profile?.interests?.length) && (
              <span className="text-sm font-medium">Не указаны</span>
            )}
          </div>
        </Section>

        {/* Языки */}
        <Section icon={Languages} title="Языки">
          <div className="flex flex-wrap gap-1.5">
            {getArrayLabels("languages", profile?.languages).map((label, i) => (
              <Badge key={`lang-${i}`} variant="warning" className="text-[10px]">{label}</Badge>
            ))}
            {(!profile?.languages || profile.languages.length === 0) && (
              <span className="text-sm font-medium">Не указаны</span>
            )}
          </div>
        </Section>

        {/* Статусы аккаунта */}
        <Section icon={ShieldCheck} title="Статусы аккаунта">
          <div className="grid grid-cols-2 gap-4">
            <StatusItem
              label="Premium"
              active={user.has_active_premium}
              activeText={user.premium_expires_at
                ? `До ${new Date(user.premium_expires_at).toLocaleDateString("ru-RU")}`
                : "Активен"
              }
              icon={<Crown className="w-3 h-3 inline" />}
            />
            <StatusItem
              label="VIP"
              active={user.has_active_vip}
              activeText={user.vip_expires_at
                ? `До ${new Date(user.vip_expires_at).toLocaleDateString("ru-RU")}`
                : "Активен"
              }
              icon={<Star className="w-3 h-3 inline" />}
            />
            <StatusItem
              label="Верификация"
              active={user.is_verified}
              activeText="Верифицирован"
              inactiveText="Не верифицирован"
            />
            <StatusItem
              label="Онбординг"
              active={user.has_completed_onboarding}
              activeText="Пройден"
              inactiveText="Не завершён"
            />
            <StatusItem
              label="Email"
              active={!!user.email_verified_at}
              activeText="Подтверждён"
              inactiveText="Не подтверждён"
            />
            <StatusItem
              label="Телефон"
              active={!!user.phone}
              activeText="Подтверждён"
              inactiveText="Нет"
            />
          </div>
        </Section>

        {/* Системные данные */}
        <Section icon={Server} title="Системные данные">
          <div className="divide-y divide-border/50">
            <InfoRow label="Регистрация" value={
              user.created_at ? new Date(user.created_at).toLocaleString("ru-RU") : "—"
            } />
            <InfoRow label="Последний визит" value={
              user.is_online ? (
                <span className="text-green-500 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> В сети
                </span>
              ) : user.last_seen ? (
                new Date(user.last_seen).toLocaleString("ru-RU")
              ) : "Никогда"
            } />
            <InfoRow label="IP (последний)" value={
              <span className="font-mono">{user.last_login_ip ?? "Нет данных"}</span>
            } />
            <InfoRow label="Телефон" value={
              <span className="font-mono">{user.phone ?? "Не указан"}</span>
            } />
          </div>
        </Section>

        {/* Настройки поиска */}
        <Section icon={Search} title="Настройки поиска">
          <div className="divide-y divide-border/50">
            <InfoRow label="Искомый пол" value={getGenderLabel(prefs?.preferred_gender)} />
            <InfoRow label="Возраст" value={`${prefs?.preferred_age_min ?? 18} - ${prefs?.preferred_age_max ?? 99}`} />
            <InfoRow label="Радиус поиска" value={
              prefs?.preferred_distance_km ? `${prefs.preferred_distance_km} км` : "Не ограничен"
            } />
          </div>

          {prefs?.search_filters && Object.keys(prefs.search_filters).length > 0 && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <p className="text-xs text-muted-foreground mb-2">Дополнительные фильтры:</p>
              <div className="flex flex-wrap gap-1.5">
                {getSearchFilterLabels(
                  prefs.search_filters as Record<string, unknown>,
                ).map((label, i) => (
                  <Badge key={i} variant="default" className="text-[10px]">{label}</Badge>
                ))}
              </div>
            </div>
          )}
        </Section>

        {/* Настройки видимости */}
        <Section icon={EyeOff} title="Настройки видимости">
          <div className="divide-y divide-border/50">
            <InfoRow label="Виден для пола" value={getGenderLabel(prefs?.visibility_gender)} />
            <InfoRow label="Виден для возраста" value={`${prefs?.visibility_age_min ?? 18} - ${prefs?.visibility_age_max ?? 99}`} />
          </div>
        </Section>

        {/* Настройки чата */}
        <Section icon={MessageCircle} title="Настройки чата">
          <div className="divide-y divide-border/50">
            <InfoRow label="Фильтр сообщений" value={
              <BooleanBadge active={!!prefs?.chat_filter_enabled} />
            } />
            {prefs?.chat_filter_enabled && prefs.chat_filter_settings && (
              <>
                <InfoRow label="Принимать от пола" value={getGenderLabel(prefs.chat_filter_settings.gender)} />
                <InfoRow label="Возраст" value={`${prefs.chat_filter_settings.age_from ?? 18} - ${prefs.chat_filter_settings.age_to ?? 99}`} />
                <InfoRow label="Только верифицированные" value={
                  <BooleanBadge active={!!prefs.chat_filter_settings.is_verified_only} />
                } />
                <InfoRow label="Только VIP" value={
                  <BooleanBadge active={!!prefs.chat_filter_settings.is_premium_only} warning />
                } />
              </>
            )}
          </div>
        </Section>

        {/* Настройки приватности */}
        <Section icon={Shield} title="Настройки приватности">
          <div className="divide-y divide-border/50">
            <InfoRow label="Невидимка (VIP)" value={
              <BooleanBadge active={!!prefs?.is_invisible} warning />
            } />
            <InfoRow label="Скрыт из поиска" value={
              <BooleanBadge active={!!prefs?.hide_from_search} destructive successOnFalse />
            } />
            <InfoRow label="Скрывать 18+ фото" value={
              <BooleanBadge active={!!prefs?.hide_intimate} successOnFalse />
            } />
            <InfoRow label="Запрет коммент. фото" value={
              <BooleanBadge active={!!prefs?.disable_photo_comments} destructive successOnFalse />
            } />
          </div>
        </Section>
      </div>
    </div>
  );
}

// ============================================
// Вспомогательные компоненты
// ============================================

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="p-4 bg-muted/20 rounded-lg border border-border">
      <p className="text-xs text-muted-foreground uppercase mb-2 font-semibold flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5" /> {title}
      </p>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-1.5 gap-2">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}

function ProfileTextRow({
  userId,
  field,
  label,
  value,
  confirmText,
}: {
  userId: number;
  field: "headline" | "bio" | "looking_for";
  label: string;
  value: string | null | undefined;
  confirmText: string;
}) {
  return (
    <div className="py-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-medium text-muted-foreground uppercase">{label}</span>
        {value && (
          <ClearFieldButton
            userId={userId}
            field={field}
            label="Удалить"
            confirmText={confirmText}
          />
        )}
      </div>
      <p className={`text-sm ${value ? "text-foreground font-medium" : "text-muted-foreground/50 italic"}`}>
        {value ? `"${value}"` : "Не указано"}
      </p>
    </div>
  );
}

function StatusItem({
  label,
  active,
  activeText,
  inactiveText = "Нет",
  icon,
}: {
  label: string;
  active: boolean;
  activeText: string;
  inactiveText?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <Badge variant={active ? "success" : "secondary"} className="text-[10px]">
        {icon}
        {active ? activeText : inactiveText}
      </Badge>
    </div>
  );
}

function BooleanBadge({
  active,
  warning = false,
  destructive = false,
  successOnFalse = false,
}: {
  active: boolean;
  warning?: boolean;
  destructive?: boolean;
  successOnFalse?: boolean;
}) {
  const variant = active
    ? destructive
      ? "destructive"
      : warning
        ? "warning"
        : "success"
    : successOnFalse
      ? "success"
      : "secondary";
  return (
    <Badge variant={variant} className="text-[10px]">
      {active ? "Да" : "Нет"}
    </Badge>
  );
}