import { DriveExplorer } from "@/features/drive/components/DriveExplorer";
import { getDriveFolderData } from "@/features/drive/queries";

export default async function DrivePage() {
  const { subfolders, files, breadcrumb } = await getDriveFolderData(null);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Drive</h1>
      <DriveExplorer folderId={null} subfolders={subfolders} files={files} breadcrumb={breadcrumb} />
    </div>
  );
}
