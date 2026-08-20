"use client";

import { useEffect, useRef, useState } from "react";
import {
  DownloadIcon,
  HistoryIcon,
  MoveIcon,
  PencilIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react";
import { toast } from "sonner";

import { FileViewer } from "@/components/file-viewer/FileViewer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { firstErrorMessage } from "@/lib/action-errors";
import { formatDateTime, formatFileSize } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";

import {
  confirmFileVersion,
  createFileVersionUploadUrl,
  deleteFile,
  getFileVersions,
  getFileViewUrl,
  moveFile,
  renameFile,
} from "../actions";
import { MoveDialog } from "./MoveDialog";
import { RenameDialog } from "./RenameDialog";

type FileEntry = { id: string; name: string; size: number; mime: string; version: number };
type FileVersion = {
  id: string;
  name: string;
  size: number;
  mime: string;
  version: number;
  created_at: string;
  deleted_at: string | null;
};

export function FilePreviewDialog({
  file,
  currentPath,
  onOpenChange,
  onChanged,
}: {
  file: FileEntry | null;
  currentPath: string | null;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}) {
  const [url, setUrl] = useState<{ url: string; mime: string; name: string } | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [versions, setVersions] = useState<FileVersion[] | null>(null);
  const [isUploadingVersion, setIsUploadingVersion] = useState(false);
  const versionInputRef = useRef<HTMLInputElement>(null);

  const open = file !== null;

  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    getFileViewUrl(file.id).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        toast.error(firstErrorMessage(result.errors, "Não foi possível carregar o arquivo."));
        return;
      }
      setUrl(result.data);
    });
    return () => {
      cancelled = true;
    };
  }, [file]);

  async function handleDelete() {
    if (!file) return;
    const result = await deleteFile(file.id, currentPath);
    if (!result.ok) {
      toast.error(firstErrorMessage(result.errors, "Não foi possível excluir."));
      return;
    }
    toast.success("Arquivo movido para a lixeira.");
    setConfirmDeleteOpen(false);
    onOpenChange(false);
    onChanged();
  }

  async function loadVersions() {
    if (!file) return;
    setVersionsOpen(true);
    const result = await getFileVersions(file.id);
    if (result.ok) setVersions(result.data);
  }

  async function handleVersionUpload(next: File) {
    if (!file) return;
    setIsUploadingVersion(true);

    const urlResult = await createFileVersionUploadUrl(next.name, next.type, next.size);
    if (!urlResult.ok) {
      setIsUploadingVersion(false);
      toast.error(firstErrorMessage(urlResult.errors, "Não foi possível iniciar o upload."));
      return;
    }

    const supabase = createClient();
    const { error: uploadErr } = await supabase.storage
      .from("files")
      .uploadToSignedUrl(urlResult.data.path, urlResult.data.token, next);

    if (uploadErr) {
      setIsUploadingVersion(false);
      toast.error("Falha ao enviar o arquivo.");
      return;
    }

    const confirmResult = await confirmFileVersion(
      file.id,
      urlResult.data.fileId,
      urlResult.data.path,
      next.name,
      next.size,
      next.type,
      currentPath,
    );
    setIsUploadingVersion(false);

    if (!confirmResult.ok) {
      toast.error(firstErrorMessage(confirmResult.errors, "Não foi possível salvar a nova versão."));
      return;
    }

    toast.success("Nova versão enviada.");
    onOpenChange(false);
    onChanged();
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="truncate pr-6">{file?.name}</DialogTitle>
          </DialogHeader>

          {file ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {url ? (
                  <Button asChild size="sm" variant="outline">
                    <a href={url.url} download={url.name}>
                      <DownloadIcon /> Baixar
                    </a>
                  </Button>
                ) : null}
                <Button size="sm" variant="outline" onClick={() => setRenameOpen(true)}>
                  <PencilIcon /> Renomear
                </Button>
                <Button size="sm" variant="outline" onClick={() => setMoveOpen(true)}>
                  <MoveIcon /> Mover
                </Button>
                <Button size="sm" variant="outline" onClick={loadVersions}>
                  <HistoryIcon /> Versões {file.version > 1 ? `(v${file.version})` : ""}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => versionInputRef.current?.click()}
                  disabled={isUploadingVersion}
                >
                  <UploadIcon /> {isUploadingVersion ? "Enviando..." : "Nova versão"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setConfirmDeleteOpen(true)}
                >
                  <Trash2Icon /> Excluir
                </Button>
                <input
                  ref={versionInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const next = e.target.files?.[0];
                    if (next) void handleVersionUpload(next);
                    e.target.value = "";
                  }}
                />
              </div>

              {url === null ? (
                <Skeleton className="h-96 w-full" />
              ) : (
                <FileViewer file={{ url: url.url, mime: url.mime, fileName: url.name }} />
              )}

              {versionsOpen ? (
                <div className="space-y-1.5 rounded-md border p-3">
                  <p className="text-sm font-medium">Histórico de versões</p>
                  {versions === null ? (
                    <Skeleton className="h-16 w-full" />
                  ) : (
                    <ul className="space-y-1 text-sm">
                      {versions.map((v) => (
                        <li key={v.id} className="flex items-center justify-between text-xs">
                          <span>
                            v{v.version} — {formatFileSize(v.size)}
                          </span>
                          <span className="text-muted-foreground">
                            {formatDateTime(v.created_at)}
                            {v.deleted_at ? " · substituída" : " · atual"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {file ? (
        <>
          <RenameDialog
            key={file.id}
            open={renameOpen}
            onOpenChange={setRenameOpen}
            currentName={file.name}
            onRename={(name) => renameFile(file.id, name, currentPath)}
            onRenamed={onChanged}
          />
          <MoveDialog
            open={moveOpen}
            onOpenChange={setMoveOpen}
            onMove={(folderId) => moveFile(file.id, folderId, currentPath)}
            onMoved={() => {
              onOpenChange(false);
              onChanged();
            }}
          />
        </>
      ) : null}

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {file?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              O arquivo vai para a lixeira e pode ser restaurado depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
