import Link from "next/link";
import { format, startOfMonth } from "date-fns";
import { ru } from "date-fns/locale";
import { requireTrainer } from "@/server/auth";
import { listDebts, monthMoney } from "@/server/services/payments";
import { addMoscowDays, formatDayMonth, plural, toMoscow } from "@/lib/time";
import { rub } from "@/lib/money";
import { Avatar, Card, Empty, PageHeader, Stat } from "@/components/ui";
import { PaidButton, SessionPriceForm } from "@/components/payments";

export const metadata = { title: "Оплаты" };

export default async function PaymentsPage() {
  const { actor } = await requireTrainer();
  const now = new Date();
  const monthStart = new Date(startOfMonth(toMoscow(now)).getTime());
  const monthEnd = new Date(startOfMonth(toMoscow(addMoscowDays(monthStart, 32))).getTime());
  const [money, debts] = await Promise.all([monthMoney(actor, monthStart, monthEnd), listDebts(actor)]);
  const month = format(toMoscow(now), "LLLL", { locale: ru });

  return (
    <>
      <PageHeader title="Оплаты" subtitle={`Деньги за ${month} и долги по разовым тренировкам`} />
      <div className="stagger grid grid-cols-1 gap-5 md:grid-cols-2 md:items-start">
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Получено" value={<Money n={money.received} />} color="green" />
            <Stat label="Ожидается" value={<Money n={money.expected} />} color={money.expected ? "red" : undefined} />
          </div>
          <p className="px-1 text-[13px] text-muted">
            Получено: {plural(money.receivedMemberships, ["абонемент", "абонемента", "абонементов"])} и {plural(money.receivedSingles, ["разовая тренировка", "разовые тренировки", "разовых тренировок"])}.
            {money.unpaidMemberships > 0 && ` Ожидается в том числе ${plural(money.unpaidMemberships, ["неоплаченный абонемент", "неоплаченных абонемента", "неоплаченных абонементов"])}.`}
          </p>
          <Card title="Цена тренировки">
            <SessionPriceForm price={money.price} />
          </Card>
        </div>

        <Card title="Ждут оплаты">
          {debts.length === 0 ? (
            <Empty>Все разовые тренировки оплачены</Empty>
          ) : (
            <ul className="divide-y divide-line/60">
              {debts.map((d) => (
                <li key={d.clientId} className="space-y-3 py-4 first:pt-0 last:pb-0">
                  <Link href={`/trainer/clients/${d.clientId}?tab=membership`} className="press flex items-center gap-3">
                    <Avatar name={d.name} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[17px] font-semibold">{d.name}</span>
                      <span className="block text-[14px] text-muted">
                        {plural(d.count, ["тренировка", "тренировки", "тренировок"])} с {formatDayMonth(d.since)}
                      </span>
                    </span>
                    {d.total !== null && <span className="font-display text-[1.2rem] font-semibold text-coral">{rub(d.total)}</span>}
                  </Link>
                  <PaidButton clientId={d.clientId} count={d.count} total={d.total} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

/** Сумма в плитке: не переносится и помещается на телефоне. */
function Money({ n }: { n: number }) {
  return <span className="whitespace-nowrap text-[1.45rem] sm:text-[1.9rem]">{rub(n)}</span>;
}
