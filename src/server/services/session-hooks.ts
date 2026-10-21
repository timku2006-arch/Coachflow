// Что происходит автоматически после того, как тренер внёс результаты тренировки.
// Порядок важен: рекорды → списание абонемента → значки (значки учитывают рекорды).
import { detectRecords, type NewRecord } from "./records";
import { writeOffForSession } from "./memberships";
import { evaluateAchievements } from "./achievements";
import { prisma } from "../db";
import type { AchievementRule } from "@/lib/achievements";

export type CompletionOutcome = { records: NewRecord[]; remaining: number | null; badges: AchievementRule[] };

export async function afterSessionCompleted(sessionId: string): Promise<CompletionOutcome> {
  const records = await detectRecords(sessionId);
  const membership = await writeOffForSession(sessionId);
  const s = await prisma.session.findUnique({ where: { id: sessionId }, select: { clientId: true } });
  const badges = s ? await evaluateAchievements(s.clientId) : [];
  return { records, remaining: membership ? membership.remainingSessions : null, badges };
}
