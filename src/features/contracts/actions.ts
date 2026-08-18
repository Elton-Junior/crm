"use server";

import { revalidatePath } from "next/cache";

import { requireOrg, requireUser } from "@/lib/auth";
import * as contractsService from "@/server/contracts";

import { contractFormSchema } from "./schema";

function toContractInput(data: {
  title: string;
  contractNo: string;
  clientId: string;
  dealId: string;
  status: contractsService.ContractInput["status"];
  value: string;
  startDate: string;
  endDate: string;
  signedAt: string;
  renewalNoticeDays: string;
  notes: string;
  tags: string[];
}): contractsService.ContractInput {
  return {
    title: data.title,
    contractNo: data.contractNo,
    clientId: data.clientId,
    dealId: data.dealId,
    status: data.status,
    valueCents: data.value ? Math.round(Number(data.value.replace(",", ".")) * 100) : 0,
    startDate: data.startDate,
    endDate: data.endDate,
    signedAt: data.signedAt,
    renewalNoticeDays: data.renewalNoticeDays === "" ? null : Number(data.renewalNoticeDays),
    notes: data.notes,
    tags: data.tags,
  };
}

export async function createContract(input: unknown) {
  const parsed = contractFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, errors: parsed.error.flatten().fieldErrors };
  }

  const { supabase, user, orgId } = await requireOrg();
  const result = await contractsService.create(supabase, {
    orgId,
    actorId: user.id,
    input: toContractInput(parsed.data),
  });

  if (!result.ok) {
    return { ok: false as const, errors: { _form: [result.error] } };
  }

  revalidatePath("/contratos");
  return { ok: true as const, data: result.data };
}

export async function updateContract(contractId: string, input: unknown) {
  const parsed = contractFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, errors: parsed.error.flatten().fieldErrors };
  }

  const { supabase, user, orgId } = await requireOrg();
  const result = await contractsService.update(supabase, {
    orgId,
    actorId: user.id,
    contractId,
    input: toContractInput(parsed.data),
  });

  if (!result.ok) {
    return { ok: false as const, errors: { _form: [result.error] } };
  }

  revalidatePath("/contratos");
  revalidatePath(`/contratos/${contractId}`);
  return { ok: true as const, data: result.data };
}

export async function deleteContract(contractId: string) {
  const { supabase, orgId } = await requireOrg();
  const result = await contractsService.softDelete(supabase, { orgId, contractId });

  if (!result.ok) {
    return { ok: false as const, errors: { _form: [result.error] } };
  }

  revalidatePath("/contratos");
  return { ok: true as const, data: null };
}

export async function duplicateContract(contractId: string) {
  const { supabase, user, orgId } = await requireOrg();
  const result = await contractsService.duplicate(supabase, {
    orgId,
    actorId: user.id,
    contractId,
  });

  if (!result.ok) {
    return { ok: false as const, errors: { _form: [result.error] } };
  }

  revalidatePath("/contratos");
  return { ok: true as const, data: result.data };
}

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
];
const MAX_FILE_SIZE = 25 * 1024 * 1024;

export async function createContractUploadUrl(
  fileName: string,
  mime: string,
  size: number,
) {
  await requireUser();

  if (!ALLOWED_MIME_TYPES.includes(mime)) {
    return { ok: false as const, errors: { _form: ["Tipo de arquivo não permitido."] } };
  }
  if (size > MAX_FILE_SIZE) {
    return { ok: false as const, errors: { _form: ["Arquivo maior que 25 MB."] } };
  }

  const { supabase, orgId } = await requireOrg();
  const result = await contractsService.createUploadUrl(supabase, {
    orgId,
    fileName,
  });

  if (!result.ok) {
    return { ok: false as const, errors: { _form: [result.error] } };
  }

  return { ok: true as const, data: result.data };
}

export async function confirmContractUpload(
  contractId: string,
  fileId: string,
  path: string,
  fileName: string,
  size: number,
  mime: string,
) {
  const { supabase, user, orgId } = await requireOrg();
  const result = await contractsService.confirmUpload(supabase, {
    orgId,
    actorId: user.id,
    contractId,
    fileId,
    path,
    fileName,
    size,
    mime,
  });

  if (!result.ok) {
    return { ok: false as const, errors: { _form: [result.error] } };
  }

  revalidatePath(`/contratos/${contractId}`);
  return { ok: true as const, data: null };
}

export async function getContractViewUrl(contractId: string) {
  const { supabase, orgId } = await requireOrg();
  const result = await contractsService.getSignedViewUrl(supabase, { orgId, contractId });

  if (!result) {
    return { ok: false as const, errors: { _form: ["Nenhum arquivo anexado."] } };
  }

  return { ok: true as const, data: result };
}
