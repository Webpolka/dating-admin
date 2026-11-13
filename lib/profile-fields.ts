// lib/profile-fields.ts
// Синхронизировано с config/profile_fields.php — ТОЧНЫЕ ключи (с пропусками!)

export const PROFILE_FIELD_OPTIONS = {
  body_type: {
    0: "Нет ответа",
    1: "Стройное",
    3: "Спортивное",
    5: "Есть пара лишних кило",
    6: "Полное",
  },
  eye_color: {
    0: "Нет ответа",
    1: "Карие",
    2: "Серые",
    3: "Голубые",
    4: "Зеленые",
  },
  hair_color: {
    0: "Нет ответа",
    1: "Блонд",
    2: "Русые",
    3: "Шатен",
    9: "Черные",
    4: "Рыжие",
    7: "Седые",
    6: "Мелированные",
    8: "Голова бритая наголо",
  },
  body_decorations: {
    1: "Пирсинг",
    2: "Татуировки",
    3: "Шрамы",
    5: "Веснушки",
  },
  relationship_status: {
    0: "Нет ответа",
    5: "Свободен",
    1: "Занят",
    2: "Женат, живем порознь",
    3: "Всё сложно",
  },
  children_status: {
    0: "Нет ответа",
    5: "Нет, и не хочу",
    8: "Нет, и ищу без детей",
    2: "Возможны в будущем",
    6: "Уже есть, больше не хочу",
    7: "Уже есть, хочу еще",
  },
  pets: {
    0: "Нет ответа",
    3: "Собака",
    2: "Кошка",
    5: "Нет",
    6: "Нет, и не хочу",
    1: "Да, много разных",
  },
  housing: {
    0: "Нет ответа",
    1: "Собственная квартира",
    7: "Дом, коттедж",
    8: "Снимаю квартиру",
    9: "Снимаю комнату",
    3: "Живу у родителей",
    10: "Без жилья",
  },
  has_car: {
    0: "Нет ответа",
    1: "Нет",
    3: "Есть",
  },
  education_level: {
    0: "Нет ответа",
    2: "Среднее",
    3: "Среднее-специальное",
    4: "Студент(-ка)",
    5: "Неполное высшее",
    6: "Высшее",
    8: "Несколько высших",
  },
  income: {
    0: "Нет ответа",
    2: "Хватает только на основное",
    3: "Хватает на основное и отдых",
    4: "На всё хватает и остаётся",
  },
  smoking: {
    0: "Нет ответа",
    8: "Против курения",
    1: "Не курю, но не против",
    5: "Иногда курю",
    9: "Курю электронные сигареты",
    2: "Курю регулярно",
  },
  alcohol: {
    0: "Нет ответа",
    5: "Против алкоголя",
    1: "Не пью, но не против",
    3: "Иногда выпиваю",
  },
  zodiac_sign: {
    1: "Овен",
    2: "Телец",
    3: "Близнецы",
    4: "Рак",
    5: "Лев",
    6: "Дева",
    7: "Весы",
    8: "Скорпион",
    9: "Стрелец",
    10: "Козерог",
    11: "Водолей",
    12: "Рыбы",
  },
  languages: {
    1: "Русский",
    8: "Украинский",
    2: "Английский",
    3: "Немецкий",
    4: "Французский",
    5: "Итальянский",
    6: "Испанский",
    7: "Португальский",
    10: "Арабский",
    9: "Иврит",
    11: "Корейский",
    12: "Китайский",
    13: "Нидерландский",
    14: "Индонезийский",
    15: "Японский",
    16: "Шведский",
    17: "Тайский",
    18: "Вьетнамский",
    20: "Турецкий",
    19: "Хинди",
  },
  sports: {
    1: "Бег",
    2: "Ходьба",
    3: "Фитнес",
    4: "Плавание",
    5: "Велосипед",
    7: "Ролики",
    8: "Лыжи",
    9: "Качалка",
    10: "Экстрим",
    11: "Единоборства",
    12: "Йога",
    13: "Командные игры",
    14: "Танцы",
    16: "Футбол",
    17: "Волейбол",
    19: "Хоккей",
    20: "Коньки",
    22: "Пилатес",
    23: "Гимнастика",
    24: "Скалолазание",
    25: "Тренировки на улице",
  },
} as const;

export const GENDER_LABELS: Record<string, string> = {
  male: "Мужчины",
  female: "Женщины",
  any: "Любой",
};

// Синхронизировано с App\Enums\DatingGoal
export const DATING_GOALS: Record<
  string,
  { label: string; color: string }
> = {
  friends: { label: "Поиск друзей", color: "bg-blue-500/10 text-blue-500" },
  romantic: { label: "Романтические отношения", color: "bg-pink-500/10 text-pink-500" },
  family: { label: "Создание семьи", color: "bg-green-500/10 text-green-500" },
  casual: { label: "Свободные отношения", color: "bg-purple-500/10 text-purple-500" },
  travel: { label: "Путешествия", color: "bg-yellow-500/10 text-yellow-500" },
};

export function getOptionLabel(
  type: keyof typeof PROFILE_FIELD_OPTIONS | string,
  value: number | string | null | undefined,
): string {
  if (value === null || value === undefined || value === "") return "Нет ответа";
  const options = (PROFILE_FIELD_OPTIONS as Record<string, Record<string | number, string>>)[
    type as string
  ];
  return options?.[value as string | number] ?? "Нет ответа";
}

export function getArrayLabels(
  type: keyof typeof PROFILE_FIELD_OPTIONS | string,
  values: number[] | null | undefined,
): string[] {
  if (!values || !Array.isArray(values) || values.length === 0) return [];
  return values.map((v) => getOptionLabel(type, v));
}

export function getGenderLabel(gender: string | null | undefined): string {
  if (!gender) return "Любой";
  return GENDER_LABELS[gender] ?? "Любой";
}

export function getZodiacLabel(sign: number | null | undefined): string {
  if (sign === null || sign === undefined) return "Нет ответа";
  return PROFILE_FIELD_OPTIONS.zodiac_sign[sign as keyof typeof PROFILE_FIELD_OPTIONS.zodiac_sign] ?? "Нет ответа";
}

export function getDatingGoals(
  goals: string[] | null | undefined,
): Array<{ value: string; label: string; color: string }> {
  if (!goals || !Array.isArray(goals) || goals.length === 0) return [];
  return goals
    .map((g) => {
      const goal = DATING_GOALS[g];
      if (!goal) return null;
      return { value: g, label: goal.label, color: goal.color };
    })
    .filter((x): x is { value: string; label: string; color: string } => x !== null);
}

export function getSearchFilterLabels(
  filters: Record<string, unknown> | null | undefined,
): string[] {
  if (!filters) return [];
  const labels: string[] = [];

  for (const [key, value] of Object.entries(filters)) {
    if (value === null || value === "" || value === false) continue;

    if (
      ["body_type", "eye_color", "hair_color", "smoking", "alcohol", "education_level", "income"].includes(
        key,
      )
    ) {
      labels.push(getOptionLabel(key, value as number | string));
    } else if (key === "is_verified_only") {
      labels.push("Только верифицированные");
    } else if (key === "is_premium_only") {
      labels.push("Только VIP");
    } else if (key === "height_from") {
      labels.push(`Рост от ${value} см`);
    } else if (key === "height_to") {
      labels.push(`Рост до ${value} см`);
    } else if (key === "zodiac_sign") {
      labels.push(`Зодиак: ${getZodiacLabel(value as number)}`);
    } else {
      const pretty = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ");
      labels.push(`${pretty}: ${typeof value === "boolean" ? "Да" : value}`);
    }
  }

  return labels;
}