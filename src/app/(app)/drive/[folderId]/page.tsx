import { DriveExplorer } from "@/features/drive/components/DriveExplorer";
import { getDriveFolderData } from "@/features/drive/queries";

export default async function DriveFolderPage({
  params,
}: PageProps<"/drive/[folderId]">) {
  const { folderId } = await params;
  const { subfolders, files, breadcrumb } = await getDriveFolderData(folderId);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Drive</h1>
      <DriveExplorer folderId={folderId} subfolders={subfolders} files={files} breadcrumb={breadcrumb} />
    </div>
  );
}
