import { DownloadIcon, FileIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ContractViewer({
  file,
}: {
  file: { url: string; mime: string; fileName: string } | null;
}) {
  if (!file) {
    return (
      <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-2 rounded-md border border-dashed text-sm text-muted-foreground">
        <FileIcon className="size-8" />
        Nenhum arquivo anexado ainda.
      </div>
    );
  }

  if (file.mime === "application/pdf") {
    return (
      <iframe
        src={file.url}
        title={file.fileName}
        className="h-full min-h-[600px] w-full rounded-md border"
      />
    );
  }

  if (file.mime.startsWith("image/")) {
    // eslint-disable-next-line @next/next/no-img-element -- signed URL de curta duração, sem sentido otimizar/cachear via next/image
    return (
      <img
        src={file.url}
        alt={file.fileName}
        className="max-h-[600px] w-full rounded-md border object-contain"
      />
    );
  }

  return (
    <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-3 rounded-md border border-dashed text-sm text-muted-foreground">
      <FileIcon className="size-8" />
      <p>{file.fileName}</p>
      <p>Sem preview no navegador para este tipo de arquivo.</p>
      <Button asChild size="sm" variant="outline">
        <a href={file.url} download={file.fileName}>
          <DownloadIcon /> Baixar
        </a>
      </Button>
    </div>
  );
}
