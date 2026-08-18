import path from "node:path";
import { readFileSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";

const TEST_EMAIL = "ensjuninho+e2e@gmail.com";
const TEST_PASSWORD = "PlaywrightE2E123!";

function loadEnv() {
  const text = readFileSync(path.resolve(__dirname, "../.env.local"), "utf8");
  for (const line of text.split("\n")) {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim();
    }
  }
}

/**
 * Provisiona (idempotente) o usuário usado pelos testes e2e — senha fixa,
 * e-mail já confirmado via Admin API (nunca passa pelo envio de e-mail,
 * então não esbarra na cota do Supabase) e membership na org existente.
 */
export default async function globalSetup() {
  loadEnv();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", TEST_EMAIL)
    .maybeSingle();

  let userId = existingProfile?.id;

  if (!userId) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    });
    if (error) throw error;
    userId = data.user.id;
  } else {
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      password: TEST_PASSWORD,
    });
    if (error) throw error;
  }

  const { data: org, error: orgErr } = await supabase
    .from("organizations")
    .select("id")
    .limit(1)
    .single();
  if (orgErr) throw orgErr;

  const { data: existingMembership } = await supabase
    .from("memberships")
    .select("id")
    .eq("org_id", org.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!existingMembership) {
    const { error } = await supabase
      .from("memberships")
      .insert({ org_id: org.id, user_id: userId, role: "member" });
    if (error) throw error;
  }

  process.env.E2E_EMAIL = TEST_EMAIL;
  process.env.E2E_PASSWORD = TEST_PASSWORD;
}
