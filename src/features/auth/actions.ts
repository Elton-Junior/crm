"use server";

import { createClient } from "@/lib/supabase/server";

import { loginSchema, passwordLoginSchema, signUpSchema } from "./schema";

function checkDomain(email: string): string | null {
  const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN?.trim();
  if (allowedDomain && email.split("@")[1] !== allowedDomain) {
    return `Use um e-mail do domínio ${allowedDomain}.`;
  }
  return null;
}

function resolveRedirect(next?: string): string {
  return next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export async function signInWithMagicLink(input: unknown, next?: string) {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, errors: parsed.error.flatten().fieldErrors };
  }

  const { email } = parsed.data;
  const domainError = checkDomain(email);
  if (domainError) {
    return { ok: false as const, errors: { email: [domainError] } };
  }

  const redirectPath = resolveRedirect(next);

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

export async function signInWithPassword(input: unknown, next?: string) {
  const parsed = passwordLoginSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, errors: parsed.error.flatten().fieldErrors };
  }

  const domainError = checkDomain(parsed.data.email);
  if (domainError) {
    return { ok: false as const, errors: { email: [domainError] } };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    const message = error.message.toLowerCase().includes("confirm")
      ? "Confirme seu e-mail antes de entrar."
      : "E-mail ou senha incorretos.";
    return { ok: false as const, errors: { _form: [message] } };
  }

  return { ok: true as const, data: { redirectTo: resolveRedirect(next) } };
}

export async function signUpWithPassword(input: unknown, next?: string) {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, errors: parsed.error.flatten().fieldErrors };
  }

  const domainError = checkDomain(parsed.data.email);
  if (domainError) {
    return { ok: false as const, errors: { email: [domainError] } };
  }

  const redirectPath = resolveRedirect(next);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=${encodeURIComponent(redirectPath)}`,
    },
  });

  if (error) {
    const lower = error.message.toLowerCase();
    const message = lower.includes("rate limit")
      ? "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo."
      : lower.includes("password")
        ? "Senha inválida."
        : "Não foi possível criar a conta. Tente novamente.";
    return { ok: false as const, errors: { _form: [message] } };
  }

  // Supabase retorna identities=[] quando o e-mail já tem conta confirmada
  // (evita revelar existência de conta por mensagem de erro diferente).
  if (data.user && data.user.identities?.length === 0) {
    return {
      ok: false as const,
      errors: { _form: ["Esse e-mail já tem conta. Faça login."] },
    };
  }

  if (data.session) {
    return {
      ok: true as const,
      data: { confirmed: true as const, redirectTo: redirectPath },
    };
  }

  return { ok: true as const, data: { confirmed: false as const, redirectTo: null } };
}
