"use client";

import { useRef, useState } from "react";
import { UploadIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { firstErrorMessage } from "@/lib/action-errors";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

import { confirmUpload, createUploadUrl } from "../actions";
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from "../schema";

type UploadItem = { id: string; name: string; status: "enviando" | "concluído" | "erro" };

export function UploadDropzone({
  folderId,
  onUploaded,
}: {
  folderId: string | null;
  onUploaded: () => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [items, setItems] = useState<UploadItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  function updateItem(id: string, status: UploadItem["status"]) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
  }

  async function uploadOne(file: File) {
    const itemId = crypto.randomUUID();
    setItems((prev) => [...prev, { id: itemId, name: file.name, status: "enviando" }]);

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      updateItem(itemId, "erro");
      toast.error(`${file.name}: tipo de arquivo não permitido.`);
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      updateItem(itemId, "erro");
      toast.error(`${file.name}: maior que 25 MB.`);
      return;
    }

    const urlResult = await createUploadUrl(file.name, file.type, file.size);
    if (!urlResult.ok) {
      updateItem(itemId, "erro");
      toast.error(firstErrorMessage(urlResult.errors, `Não foi possível enviar ${file.name}.`));
      return;
    }

    const supabase = createClient();
    const { error: uploadErr } = await supabase.storage
      .from("files")
      .uploadToSignedUrl(urlResult.data.path, urlResult.data.token, file);

    if (uploadErr) {
      updateItem(itemId, "erro");
      toast.error(`Falha ao enviar ${file.name}.`);
      return;
    }

    const confirmResult = await confirmUpload(
      urlResult.data.fileId,
      urlResult.data.path,
      file.name,
      file.size,
      file.type,
      folderId,
    );

    if (!confirmResult.ok) {
      updateItem(itemId, "erro");
      toast.error(firstErrorMessage(confirmResult.errors, `Upload de ${file.name} feito, mas não foi possível salvar.`));
      return;
    }

    updateItem(itemId, "concluído");
    onUploaded();
  }

  async function handleFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (files.length === 0) return;
    await Promise.all(files.map(uploadOne));
  }

  const isUploading = items.some((i) => i.status === "enviando");

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
        if (e.dataTransfer.files.length > 0) void handleFiles(e.dataTransfer.files);
      }}
      className={cn(
        "flex flex-col gap-2 rounded-md border-2 border-dashed p-3 text-sm text-muted-foreground",
        isDragging && "border-primary bg-accent/40",
      )}
    >
      <div className="flex items-center gap-2">
        <UploadIcon className="size-4" />
        <span>Arraste arquivos aqui ou</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
        >
          Selecionar arquivos
        </Button>
        <span className="text-xs">PDF, DOC, DOCX, PNG ou JPEG · máx. 25 MB cada</span>
      </div>

      {items.length > 0 ? (
        <ul className="space-y-1 text-xs">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-2">
              <span className="truncate">{item.name}</span>
              <span
                className={cn(
                  item.status === "erro" && "text-destructive",
                  item.status === "concluído" && "text-green-600 dark:text-green-500",
                )}
              >
                {item.status}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ALLOWED_MIME_TYPES.join(",")}
        className="hidden"
        onChange={(e) => {
          if (e.target.files) void handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
