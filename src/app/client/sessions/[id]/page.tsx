import { requireClient } from "@/server/auth";
import { SessionDetail } from "@/components/session-detail";

export const metadata = { title: "Занятие" };

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ booked?: string }> }) {
  const { actor } = await requireClient();
  const { id } = await params;
  const { booked } = await searchParams;
  return <SessionDetail actor={actor} sessionId={id} flash={booked ? "Вы записаны на занятие" : undefined} />;
}
