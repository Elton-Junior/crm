import { MyTasksList } from "@/features/tasks/components/MyTasksList";
import { getMyTasks } from "@/features/tasks/queries";
import { requireOrg } from "@/lib/auth";
import * as clientsService from "@/server/clients";

export default async function TarefasPage() {
  const { supabase, orgId } = await requireOrg();
  const [groups, members] = await Promise.all([
    getMyTasks(),
    clientsService.listMembers(supabase, orgId),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Minhas tarefas</h1>
        <p className="text-sm text-muted-foreground">
          Tarefas atribuídas a você em todos os projetos, agrupadas por prazo.
        </p>
      </div>

      <MyTasksList groups={groups} members={members} />
    </div>
  );
}
