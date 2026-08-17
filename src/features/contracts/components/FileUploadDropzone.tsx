"use client";

import { useRef, useState } from "react";
import { UploadIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { firstErrorMessage } from "@/lib/action-errors";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

import { confirmContractUpload, createContractUploadUrl } from "../actions";

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
];
const MAX_FILE_SIZE = 25 * 1024 * 1024;

export function FileUploadDropzone({
  contractId,
  onUploaded,
}: {
  contractId: string;
  onUploaded: (file: { name: string; size: number; mime: string }) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
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

    const urlResult = await createContractUploadUrl(
      contractId,
      file.name,
      file.type,
      file.size,
    );
    if (!urlResult.ok) {
      setIsUploading(false);
      setProgressLabel(null);
      toast.error(firstErrorMessage(urlResult.errors, "Não foi possível iniciar o upload."));
      return;
    }

    setProgressLabel("Enviando...");
    const supabase = createClient();
    const { error: uploadErr } = await supabase.storage
      .from("contracts")
      .uploadToSignedUrl(urlResult.data.path, urlResult.data.token, file);

    if (uploadErr) {
      setIsUploading(false);
      setProgressLabel(null);
      toast.error("Falha ao enviar o arquivo. Tente de novo.");
      return;
    }

    setProgressLabel("Confirmando...");
    const confirmResult = await confirmContractUpload(
      contractId,
      urlResult.data.path,
      file.name,
      file.size,
      file.type,
    );
    setIsUploading(false);
    setProgressLabel(null);

    if (!confirmResult.ok) {
      toast.error(
        firstErrorMessage(confirmResult.errors, "Upload feito, mas não foi possível salvar."),
      );
      return;
    }

    toast.success("Arquivo enviado.");
    onUploaded({ name: file.name, size: file.size, mime: file.type });
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) void handleFile(file);
      }}
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-6 text-center text-sm text-muted-foreground",
        isDragging && "border-primary bg-accent/40",
      )}
    >
      <UploadIcon className="size-6" />
      {isUploading ? (
        <p>{progressLabel}</p>
      ) : (
        <>
          <p>Arraste um arquivo aqui ou</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
          >
            Selecionar arquivo
          </Button>
          <p className="text-xs">PDF, DOC, DOCX, PNG ou JPEG · máx. 25 MB</p>
        </>
      )}
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
