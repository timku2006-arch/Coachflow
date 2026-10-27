// Самочувствие после тренировки: клиент отвечает одним нажатием.

export type Mood = 1 | 2 | 3;

export const MOODS: { value: Mood; emoji: string; label: string }[] = [
  { value: 3, emoji: "😊", label: "Отлично" },
  { value: 2, emoji: "😐", label: "Нормально" },
  { value: 1, emoji: "😣", label: "Тяжело" },
];

export const moodOf = (v: number | null | undefined) => MOODS.find((m) => m.value === v) ?? null;

/** Через сколько минут после окончания тренировки спросить. */
export const FEEDBACK_DELAY_MIN = 30;
/** Сколько дней после тренировки вопрос висит на главной клиента. */
export const FEEDBACK_WINDOW_DAYS = 3;

/** Тренеру сообщаем только о том, на что стоит обратить внимание: «тяжело» или комментарий. */
export const needsTrainerAttention = (mood: number, note: string | null | undefined) => mood === 1 || !!note?.trim();
