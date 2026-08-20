import { FolderTreeSidebar } from "@/features/drive/components/FolderTreeSidebar";
import { requireOrg } from "@/lib/auth";
import * as foldersService from "@/server/folders";

export default async function DriveLayout({ children }: { children: React.ReactNode }) {
  const { supabase, orgId } = await requireOrg();
  const rootFolders = await foldersService.listChildren(supabase, orgId, null);

  return (
    <div className="flex gap-6">
      <FolderTreeSidebar rootFolders={rootFolders.filter((f) => !f.is_private)} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
