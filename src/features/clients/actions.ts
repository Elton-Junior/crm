"use server";

import { revalidatePath } from "next/cache";

import { requireOrg, requireUser } from "@/lib/auth";
import * as clientsService from "@/server/clients";

import { clientFormSchema } from "./schema";

export async function createClient(input: unknown) {
  const parsed = clientFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, errors: parsed.error.flatten().fieldErrors };
  }

  const { supabase, user, orgId } = await requireOrg();

  const result = await clientsService.create(supabase, {
    orgId,
    actorId: user.id,
    input: parsed.data,
  });

  if (!result.ok) return result;

  revalidatePath("/clientes");
  return { ok: true as const, data: result.data };
}

export async function updateClient(clientId: string, input: unknown) {
  const parsed = clientFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, errors: parsed.error.flatten().fieldErrors };
  }

  const { supabase, user, orgId } = await requireOrg();

  const result = await clientsService.update(supabase, {
    orgId,
    actorId: user.id,
    clientId,
    input: parsed.data,
  });

  if (!result.ok) return result;

  revalidatePath("/clientes");
  return { ok: true as const, data: result.data };
}

export async function getClient(clientId: string) {
  const { supabase, orgId } = await requireOrg();

  const client = await clientsService.getById(supabase, orgId, clientId);
  if (!client) {
    return { ok: false as const, errors: { _form: ["Cliente não encontrado."] } };
  }

  return { ok: true as const, data: client };
}

export async function checkDocumentAvailable(document: string, excludeId?: string) {
  const { supabase, orgId } = await requireOrg();

  const exists = await clientsService.documentExists(supabase, {
    orgId,
    document,
    excludeId,
  });

  return { ok: true as const, data: { available: !exists } };
}

type BrasilApiCep = {
  cep: string;
  state: string;
  city: string;
  neighborhood: string;
  street: string;
};

export async function lookupCep(cep: string) {
  await requireUser();

  const digits = cep.replace(/\D/g, "");
  if (digits.length !== 8) {
    return { ok: false as const, errors: { zipCode: ["CEP inválido."] } };
  }

  try {
    const response = await fetch(`https://brasilapi.com.br/api/cep/v2/${digits}`);
    if (!response.ok) {
      return { ok: false as const, errors: { zipCode: ["CEP não encontrado."] } };
    }

    const data = (await response.json()) as BrasilApiCep;
    return {
      ok: true as const,
      data: {
        street: data.street ?? "",
        district: data.neighborhood ?? "",
        city: data.city ?? "",
        state: data.state ?? "",
      },
    };
  } catch {
    return {
      ok: false as const,
      errors: { zipCode: ["Não foi possível consultar o CEP agora."] },
    };
  }
}

export async function deleteClient(clientId: string) {
  const { supabase, user, orgId } = await requireOrg();

  const result = await clientsService.softDelete(supabase, {
    orgId,
    clientId,
    actorId: user.id,
  });

  if (!result.ok) {
    return { ok: false as const, errors: { _form: [result.error] } };
  }

  revalidatePath("/clientes");
  return { ok: true as const, data: null };
}
