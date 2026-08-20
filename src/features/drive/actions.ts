"use server";

import { revalidatePath } from "next/cache";

import { requireOrg, requireUser } from "@/lib/auth";
import * as filesService from "@/server/files";
import * as foldersService from "@/server/folders";

import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE, folderNameSchema } from "./schema";

function folderPath(folderId: string | null): string {
  return folderId ? `/drive/${folderId}` : "/drive";
}

export async function getFolderContents(folderId: string | null) {
  const { supabase, orgId } = await requireOrg();

  const [subfolders, files, breadcrumb] = await Promise.all([
    foldersService.listChildren(supabase, orgId, folderId),
    filesService.listInFolder(supabase, orgId, folderId),
    folderId ? foldersService.getBreadcrumb(supabase, folderId) : Promise.resolve([]),
  ]);

  return { subfolders, files, breadcrumb };
}

/** Só os filhos diretos — usado pela árvore lateral (carregamento lazy por nó, §5.2). */
export async function listSubfolders(parentId: string | null) {
  const { supabase, orgId } = await requireOrg();
  return foldersService.listChildren(supabase, orgId, parentId);
}

export async function getPrivateFolder() {
  const { supabase, user, orgId } = await requireOrg();
  return foldersService.getOrCreatePrivateFolder(supabase, orgId, user.id);
}

export async function searchFiles(query: string) {
  const { supabase, orgId } = await requireOrg();
  return filesService.search(supabase, orgId, query);
}

export async function listMoveTargets() {
  const { supabase, orgId } = await requireOrg();
  return foldersService.listAllFlat(supabase, orgId);
}

export async function createFolder(name: unknown, parentId: string | null) {
  const parsed = folderNameSchema.safeParse(name);
  if (!parsed.success) {
    return { ok: false as const, errors: { _form: [parsed.error.issues[0].message] } };
  }

  const { supabase, user, orgId } = await requireOrg();
  const result = await foldersService.create(supabase, {
    orgId,
    actorId: user.id,
    name: parsed.data,
    parentId,
    isPrivate: false,
  });

  if (!result.ok) return { ok: false as const, errors: { _form: [result.error] } };

  revalidatePath(folderPath(parentId));
  return { ok: true as const, data: result.data };
}

export async function renameFolder(folderId: string, name: unknown, currentPath: string | null) {
  const parsed = folderNameSchema.safeParse(name);
  if (!parsed.success) {
    return { ok: false as const, errors: { _form: [parsed.error.issues[0].message] } };
  }

  const { supabase, orgId } = await requireOrg();
  const result = await foldersService.rename(supabase, { orgId, folderId, name: parsed.data });

  if (!result.ok) return { ok: false as const, errors: { _form: [result.error] } };

  revalidatePath(folderPath(currentPath));
  return { ok: true as const, data: null };
}

export async function moveFolder(folderId: string, parentId: string | null, currentPath: string | null) {
  const { supabase, orgId } = await requireOrg();
  const result = await foldersService.move(supabase, { orgId, folderId, parentId });

  if (!result.ok) return { ok: false as const, errors: { _form: [result.error] } };

  revalidatePath(folderPath(currentPath));
  revalidatePath(folderPath(parentId));
  return { ok: true as const, data: null };
}

export async function deleteFolder(folderId: string, currentPath: string | null) {
  const { supabase, orgId } = await requireOrg();
  const result = await foldersService.softDelete(supabase, { orgId, folderId });

  if (!result.ok) return { ok: false as const, errors: { _form: [result.error] } };

  revalidatePath(folderPath(currentPath));
  return { ok: true as const, data: null };
}

export async function renameFile(fileId: string, name: unknown, currentPath: string | null) {
  const parsed = folderNameSchema.safeParse(name);
  if (!parsed.success) {
    return { ok: false as const, errors: { _form: [parsed.error.issues[0].message] } };
  }

  const { supabase, orgId } = await requireOrg();
  const result = await filesService.rename(supabase, { orgId, fileId, name: parsed.data });

  if (!result.ok) return { ok: false as const, errors: { _form: [result.error] } };

  revalidatePath(folderPath(currentPath));
  return { ok: true as const, data: null };
}

export async function moveFile(fileId: string, folderId: string | null, currentPath: string | null) {
  const { supabase, orgId } = await requireOrg();
  const result = await filesService.move(supabase, { orgId, fileId, folderId });

  if (!result.ok) return { ok: false as const, errors: { _form: [result.error] } };

  revalidatePath(folderPath(currentPath));
  revalidatePath(folderPath(folderId));
  return { ok: true as const, data: null };
}

export async function deleteFile(fileId: string, currentPath: string | null) {
  const { supabase, orgId } = await requireOrg();
  const result = await filesService.softDelete(supabase, { orgId, fileId });

  if (!result.ok) return { ok: false as const, errors: { _form: [result.error] } };

  revalidatePath(folderPath(currentPath));
  return { ok: true as const, data: null };
}

export async function getFileViewUrl(fileId: string) {
  const { supabase, orgId } = await requireOrg();
  const result = await filesService.getSignedUrl(supabase, { orgId, fileId });

  if (!result) return { ok: false as const, errors: { _form: ["Arquivo não encontrado."] } };
  return { ok: true as const, data: result };
}

export async function getFileVersions(fileId: string) {
  const { supabase, orgId } = await requireOrg();
  const data = await filesService.listVersions(supabase, orgId, fileId);
  return { ok: true as const, data };
}

export async function getTrash() {
  const { supabase, orgId } = await requireOrg();
  const [folders, files] = await Promise.all([
    foldersService.listTrash(supabase, orgId),
    filesService.listTrash(supabase, orgId),
  ]);
  return { folders, files };
}

export async function restoreFolder(folderId: string) {
  const { supabase, orgId } = await requireOrg();
  const result = await foldersService.restore(supabase, { orgId, folderId });

  if (!result.ok) return { ok: false as const, errors: { _form: [result.error] } };

  revalidatePath("/drive");
  return { ok: true as const, data: null };
}

export async function restoreFile(fileId: string) {
  const { supabase, orgId } = await requireOrg();
  const result = await filesService.restore(supabase, { orgId, fileId });

  if (!result.ok) return { ok: false as const, errors: { _form: [result.error] } };

  revalidatePath("/drive");
  return { ok: true as const, data: null };
}

export async function createUploadUrl(fileName: string, mime: string, size: number) {
  await requireUser();

  if (!ALLOWED_MIME_TYPES.includes(mime)) {
    return { ok: false as const, errors: { _form: ["Tipo de arquivo não permitido."] } };
  }
  if (size > MAX_FILE_SIZE) {
    return { ok: false as const, errors: { _form: ["Arquivo maior que 25 MB."] } };
  }

  const { supabase, orgId } = await requireOrg();
  const result = await filesService.createUploadUrl(supabase, { orgId, fileName });

  if (!result.ok) return { ok: false as const, errors: { _form: [result.error] } };
  return { ok: true as const, data: result.data };
}

export async function confirmUpload(
  fileId: string,
  path: string,
  fileName: string,
  size: number,
  mime: string,
  folderId: string | null,
) {
  const { supabase, user, orgId } = await requireOrg();
  const result = await filesService.confirmUpload(supabase, {
    id: fileId,
    orgId,
    actorId: user.id,
    folderId,
    path,
    name: fileName,
    size,
    mime,
  });

  if (!result.ok) return { ok: false as const, errors: { _form: [result.error] } };

  revalidatePath(folderPath(folderId));
  return { ok: true as const, data: result.data };
}

export async function createFileVersionUploadUrl(fileName: string, mime: string, size: number) {
  return createUploadUrl(fileName, mime, size);
}

export async function confirmFileVersion(
  previousFileId: string,
  fileId: string,
  path: string,
  fileName: string,
  size: number,
  mime: string,
  currentPath: string | null,
) {
  const { supabase, user, orgId } = await requireOrg();
  const result = await filesService.createVersion(supabase, {
    orgId,
    actorId: user.id,
    previousFileId,
    id: fileId,
    path,
    name: fileName,
    size,
    mime,
  });

  if (!result.ok) return { ok: false as const, errors: { _form: [result.error] } };

  revalidatePath(folderPath(currentPath));
  return { ok: true as const, data: result.data };
}
