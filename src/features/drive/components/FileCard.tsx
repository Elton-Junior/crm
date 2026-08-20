import { FileIcon, FileImageIcon, FileTextIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { formatFileSize } from "@/lib/format";

type FileEntry = { id: string; name: string; size: number; mime: string; version: number };

export function FileCard({ file, onClick }: { file: FileEntry; onClick: () => void }) {
  return (
    <Card className="p-3">
      <button type="button" onClick={onClick} className="flex w-full items-center gap-2 text-left">
        {file.mime.startsWith("image/") ? (
          <FileImageIcon className="size-5 shrink-0 text-muted-foreground" />
        ) : file.mime === "application/pdf" ? (
          <FileTextIcon className="size-5 shrink-0 text-muted-foreground" />
        ) : (
          <FileIcon className="size-5 shrink-0 text-muted-foreground" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{file.name}</p>
          <p className="text-xs text-muted-foreground">
            {formatFileSize(file.size)}
            {file.version > 1 ? ` · v${file.version}` : ""}
          </p>
        </div>
      </button>
    </Card>
  );
}
