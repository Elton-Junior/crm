import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

type Supabase = SupabaseClient<Database>;
type MemberRole = Database["public"]["Enums"]["member_role"];

export type TeamMember = {
  membershipId: string;
  userId: string;
  fullName: string | null;
  email: string;
  role: MemberRole;
};

export async function listMembersWithRole(
  supabase: Supabase,
  orgId: string,
): Promise<TeamMember[]> {
  const { data, error } = await supabase
    .from("memberships")
    .select(
      "id, role, user_id, profile:profiles!memberships_user_id_fkey(id, full_name, email)",
    )
    .eq("org_id", orgId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? [])
    .map((m) => {
      const profile = m.profile as unknown as {
        id: string;
        full_name: string | null;
        email: string;
      } | null;
      if (!profile) return null;
      return {
        membershipId: m.id,
        userId: m.user_id,
        fullName: profile.full_name,
        email: profile.email,
        role: m.role,
      };
    })
    .filter((m): m is TeamMember => m !== null);
}

/**
 * Convida por e-mail. Se a pessoa já tem conta (de um convite anterior ou
 * outra org), só cria a membership; senão cria o usuário no Auth via Admin
 * API (isso dispara o trigger `handle_new_user()`, que já cria o profile) e
 * então a membership. Sujeito à mesma cota de e-mail do magic link — ver
 * memória do projeto sobre isso; o erro do Supabase já vem com mensagem
 * amigável o bastante pra repassar direto.
 */
export async function inviteMember(
  supabase: Supabase,
  params: { orgId: string; email: string; role: MemberRole; siteUrl: string },
) {
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", params.email)
    .maybeSingle();

  if (existingProfile) {
    const { data: existingMembership } = await supabase
      .from("memberships")
      .select("id")
      .eq("org_id", params.orgId)
      .eq("user_id", existingProfile.id)
      .maybeSingle();

    if (existingMembership) {
      return { ok: false as const, error: "Esse e-mail já faz parte da organização." };
    }

    const { error: membershipErr } = await supabase
      .from("memberships")
      .insert({ org_id: params.orgId, user_id: existingProfile.id, role: params.role });
    if (membershipErr) return { ok: false as const, error: membershipErr.message };
    return { ok: true as const };
  }

  const admin = createAdminClient();
  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
    params.email,
    { redirectTo: `${params.siteUrl}/dashboard` },
  );
  if (inviteErr) return { ok: false as const, error: inviteErr.message };

  const { error: membershipErr } = await supabase
    .from("memberships")
    .insert({ org_id: params.orgId, user_id: invited.user.id, role: params.role });
  if (membershipErr) return { ok: false as const, error: membershipErr.message };

  return { ok: true as const };
}

export async function removeMember(
  supabase: Supabase,
  params: { orgId: string; membershipId: string },
) {
  const { error } = await supabase
    .from("memberships")
    .delete()
    .eq("id", params.membershipId)
    .eq("org_id", params.orgId);

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function updateMemberRole(
  supabase: Supabase,
  params: { orgId: string; membershipId: string; role: MemberRole },
) {
  const { error } = await supabase
    .from("memberships")
    .update({ role: params.role })
    .eq("id", params.membershipId)
    .eq("org_id", params.orgId);

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}
