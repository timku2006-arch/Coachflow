import { requireClient } from "@/server/auth";
import { listNotifications, vapidPublicKey } from "@/server/services/notifications";
import { PageHeader } from "@/components/ui";
import { NotificationsView } from "@/components/notifications-view";

export const metadata = { title: "Уведомления" };

export default async function NotificationsPage() {
  const { user } = await requireClient();
  const [items, publicKey] = await Promise.all([listNotifications(user.id), vapidPublicKey()]);
  return (
    <>
      <PageHeader title="Уведомления" />
      <NotificationsView items={items} publicKey={publicKey} />
    </>
  );
}
