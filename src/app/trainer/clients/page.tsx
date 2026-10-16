import Link from "next/link";
import { requireTrainer } from "@/server/auth";
import { listClients } from "@/server/services/clients";
import { formatDateTime } from "@/lib/time";
import { Avatar, Card, Empty, LinkButton, PageHeader } from "@/components/ui";
import { ChevronRight, UserPlus, Users } from "lucide-react";

export const metadata = { title: "Клиенты" };

export default async function ClientsPage() {
  const { actor } = await requireTrainer();
  const clients = await listClients(actor);
  return (
    <>
      <PageHeader title="Клиенты" subtitle={`Всего: ${clients.length}`} action={
          <LinkButton href="/trainer/clients/new">
            <UserPlus size={17} /> Новый клиент
          </LinkButton>
        } />
      <Card>
        {clients.length === 0 ? (
          <Empty icon={<Users size={28} />}>Клиентов пока нет. Создайте первого!</Empty>
        ) : (
          <ul className="stagger divide-y divide-line/60">
            {clients.map((c) => (
              <li key={c.id}>
                <Link href={`/trainer/clients/${c.id}`} className="press group -mx-2 flex items-center gap-3 rounded-xl px-2 py-3 hover:bg-subtle/60">
                  <Avatar name={c.user.name} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[17px] font-semibold">{c.user.name}</span>
                    <span className="block truncate text-[14px] text-muted">{c.goal ?? c.user.email}</span>
                  </span>
                  <span className="hidden text-right text-xs text-muted sm:block">
                    {c.sessions[0] ? <>Следующее:<br />{formatDateTime(c.sessions[0].startsAt)}</> : "Нет записей"}
                  </span>
                  <ChevronRight size={18} className="text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
