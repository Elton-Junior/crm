import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type MemberRole = Database["public"]["Enums"]["member_role"];

/** Garante um usuário autenticado. Redireciona para /login se não houver sessão. */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { supabase, user };
}

/**
 * Garante usuário autenticado **e** com membership em uma org.
 * Redireciona para /sem-acesso se o usuário não pertencer a nenhuma organização.
 */
export async function requireOrg() {
  const { supabase, user } = await requireUser();

  const { data: membership } = await supabase
    .from("memberships")
    .select("org_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) {
    redirect("/sem-acesso");
  }

  return {
    supabase,
    user,
    orgId: membership.org_id,
    role: membership.role,
  };
}

/**
 * Garante usuário autenticado, com org e com um dos papéis permitidos.
 * Redireciona para /dashboard se o papel não for suficiente.
 */
export async function requireRole(roles: MemberRole[]) {
  const ctx = await requireOrg();

  if (!roles.includes(ctx.role)) {
    redirect("/dashboard");
  }

  return ctx;
}
