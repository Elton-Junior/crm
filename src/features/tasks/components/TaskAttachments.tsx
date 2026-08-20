"use client";

import { useRef, useState } from "react";
import { FileIcon, UploadIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { firstErrorMessage } from "@/lib/action-errors";
import { formatFileSize } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

import { confirmTaskUpload, createTaskUploadUrl } from "../actions";

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
];
const MAX_FILE_SIZE = 25 * 1024 * 1024;

export type AttachmentItem = { id: string; name: string; size: number; mime: string };

export function TaskAttachments({
  taskId,
  initialItems,
}: {
  taskId: string;
  initialItems: AttachmentItem[];
}) {
  const [items, setItems] = useState(initialItems);
  const [isUploading, setIsUploading] = useState(false);
  const [progressLabel, setProgressLabel] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      toast.error("Tipo de arquivo não permitido. Use PDF, DOC, DOCX, PNG ou JPEG.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Arquivo maior que 25 MB.");
      return;
    }

    setIsUploading(true);
    setProgressLabel("Preparando envio...");

    const urlResult = await createTaskUploadUrl(file.name, file.type, file.size);
    if (!urlResult.ok) {
      setIsUploading(false);
      setProgressLabel(null);
      toast.error(firstErrorMessage(urlResult.errors, "Não foi possível iniciar o upload."));
      return;
    }

    setProgressLabel("Enviando...");
    const supabase = createClient();
    const { error: uploadErr } = await supabase.storage
      .from("files")
      .uploadToSignedUrl(urlResult.data.path, urlResult.data.token, file);

    if (uploadErr) {
      setIsUploading(false);
      setProgressLabel(null);
      toast.error("Falha ao enviar o arquivo. Tente de novo.");
      return;
    }

    setProgressLabel("Confirmando...");
    const confirmResult = await confirmTaskUpload(
      taskId,
      urlResult.data.fileId,
      urlResult.data.path,
      file.name,
      file.size,
      file.type,
    );
    setIsUploading(false);
    setProgressLabel(null);

    if (!confirmResult.ok) {
      toast.error(firstErrorMessage(confirmResult.errors, "Upload feito, mas não foi possível salvar."));
      return;
    }

    setItems((prev) => [...prev, { id: urlResult.data.fileId, name: file.name, size: file.size, mime: file.type }]);
    toast.success("Arquivo enviado.");
  }

  return (
    <div className="space-y-3">
      {items.length > 0 ? (
        <ul className="space-y-1.5">
          {items.map((file) => (
            <li key={file.id} className="flex items-center gap-2 rounded-md border p-2 text-sm">
              <FileIcon className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">{file.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatFileSize(file.size)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Nenhum anexo ainda.</p>
      )}

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files?.[0];
          if (file) void handleFile(file);
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-4 text-center text-xs text-muted-foreground",
        )}
      >
        <UploadIcon className="size-5" />
        {isUploading ? (
          <p>{progressLabel}</p>
        ) : (
          <>
            <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
              Selecionar arquivo
            </Button>
            <p>ou arraste aqui — PDF, DOC, DOCX, PNG ou JPEG · máx. 25 MB</p>
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_MIME_TYPES.join(",")}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
