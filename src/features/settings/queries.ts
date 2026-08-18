import "server-only";

import { requireOrg } from "@/lib/auth";
import * as dealsService from "@/server/deals";
import * as organizationsService from "@/server/organizations";
import * as teamService from "@/server/team";

/** Dados agregados para a página /configuracoes — uma leitura por aba. */
export async function getSettingsData() {
  const { supabase, user, orgId, role } = await requireOrg();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url")
    .eq("id", user.id)
    .single();

  const pipelineId = await dealsService.getDefaultPipelineId(supabase, orgId);

  const [organization, members, stages] = await Promise.all([
    organizationsService.getOrganization(supabase, orgId),
    teamService.listMembersWithRole(supabase, orgId),
    pipelineId ? dealsService.listStages(supabase, orgId, pipelineId) : Promise.resolve([]),
  ]);

  return {
    role,
    profile: {
      id: profile?.id ?? user.id,
      fullName: profile?.full_name ?? "",
      email: profile?.email ?? user.email ?? "",
      avatarUrl: profile?.avatar_url ?? "",
    },
    organization,
    members,
    pipelineId,
    stages,
  };
}
