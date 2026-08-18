import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

type Supabase = SupabaseClient<Database>;
const BUCKET = "avatars";

export async function updateProfile(
  supabase: Supabase,
  params: { userId: string; fullName: string },
) {
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: params.fullName || null })
    .eq("id", params.userId);

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

function slugifyFileName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9.]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

export async function createAvatarUploadUrl(
  supabase: Supabase,
  params: { userId: string; fileName: string },
) {
  // timestamp no nome evita colisão e força o navegador a não usar cache
  // antigo da URL pública após trocar o avatar.
  const path = `${params.userId}/${Date.now()}-${slugifyFileName(params.fileName)}`;

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error) return { ok: false as const, error: error.message };

  return { ok: true as const, data: { path, token: data.token } };
}

export async function confirmAvatarUpload(
  supabase: Supabase,
  params: { userId: string; path: string },
) {
  const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(params.path);

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrlData.publicUrl })
    .eq("id", params.userId);

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, data: { avatarUrl: publicUrlData.publicUrl } };
}
