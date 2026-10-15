import Link from "next/link";
import { requireTrainer } from "@/server/auth";
import { listClients } from "@/server/services/clients";
import { formatDateTime } from "@/lib/time";
import { Card, Empty, LinkButton, PageHeader } from "@/components/ui";

export const metadata = { title: "Клиенты" };

export default async function ClientsPage() {
  const { actor } = await requireTrainer();
  const clients = await listClients(actor);
  return (
    <>
      <PageHeader title="Клиенты" subtitle={`Всего: ${clients.length}`} action={<LinkButton href="/trainer/clients/new">+ Новый клиент</LinkButton>} />
      <Card>
        {clients.length === 0 ? (
          <Empty>Клиентов пока нет. Создайте первого!</Empty>
        ) : (
          <ul className="divide-y divide-slate-100">
            {clients.map((c) => (
              <li key={c.id}>
                <Link href={`/trainer/clients/${c.id}`} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-3 hover:bg-slate-50">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-800">
                    {c.user.name.slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{c.user.name}</span>
                    <span className="block truncate text-sm text-slate-500">{c.goal ?? c.user.email}</span>
                  </span>
                  <span className="hidden text-right text-xs text-slate-500 sm:block">
                    {c.sessions[0] ? <>Следующее:<br />{formatDateTime(c.sessions[0].startsAt)}</> : "Нет записей"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
