import "server-only";

import { notFound } from "next/navigation";

import { requireOrg } from "@/lib/auth";
import * as filesService from "@/server/files";
import * as foldersService from "@/server/folders";

export async function getDriveFolderData(folderId: string | null) {
  const { supabase, orgId } = await requireOrg();

  if (folderId) {
    const { data: folder, error } = await supabase
      .from("folders")
      .select("id, name, is_private")
      .eq("id", folderId)
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    if (!folder) notFound();
  }

  const [subfolders, files, breadcrumb] = await Promise.all([
    foldersService.listChildren(supabase, orgId, folderId),
    filesService.listInFolder(supabase, orgId, folderId),
    folderId ? foldersService.getBreadcrumb(supabase, folderId) : Promise.resolve([]),
  ]);

  return { subfolders, files, breadcrumb };
}
