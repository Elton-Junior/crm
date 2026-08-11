"use server";

import { createClient } from "@/lib/supabase/server";

import { loginSchema } from "./schema";

export async function signInWithMagicLink(input: unknown, next?: string) {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, errors: parsed.error.flatten().fieldErrors };
  }

  const { email } = parsed.data;
  const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN?.trim();

  if (allowedDomain && email.split("@")[1] !== allowedDomain) {
    return {
      ok: false as const,
      errors: { email: [`Use um e-mail do domínio ${allowedDomain}.`] },
    };
  }

  const redirectPath = next?.startsWith("/") && !next.startsWith("//")
    ? next
    : "/dashboard";

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=${encodeURIComponent(redirectPath)}`,
    },
  });

  if (error) {
    return { ok: false as const, errors: { email: [error.message] } };
  }

  return { ok: true as const, data: null };
}
