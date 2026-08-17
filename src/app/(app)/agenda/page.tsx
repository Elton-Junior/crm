import { AgendaPageClient } from "@/features/events/components/AgendaPageClient";
import { requireOrg } from "@/lib/auth";
import * as clientsService from "@/server/clients";

export default async function AgendaPage() {
  const { supabase, orgId, user } = await requireOrg();
  const members = await clientsService.listMembers(supabase, orgId);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Agenda</h1>
      <AgendaPageClient members={members} currentUserId={user.id} />
    </div>
  );
}
