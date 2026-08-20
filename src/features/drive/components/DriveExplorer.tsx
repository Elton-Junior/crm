"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FolderPlusIcon,
  FolderOpenIcon,
  SearchIcon,
  Trash2Icon,
  UploadIcon,
  XIcon,
} from "lucide-react";

import { EmptyState } from "@/components/layout/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { searchFiles } from "../actions";
import { FileCard } from "./FileCard";
import { FilePreviewDialog } from "./FilePreviewDialog";
import { FolderCard } from "./FolderCard";
import { NewFolderDialog } from "./NewFolderDialog";
import { TrashDialog } from "./TrashDialog";
import { UploadDropzone } from "./UploadDropzone";

type Folder = { id: string; name: string; is_private: boolean };
type FileEntry = { id: string; name: string; size: number; mime: string; version: number };
type BreadcrumbSegment = { id: string; name: string };

export function DriveExplorer({
  folderId,
  subfolders,
  files,
  breadcrumb,
}: {
  folderId: string | null;
  subfolders: Folder[];
  files: FileEntry[];
  breadcrumb: BreadcrumbSegment[];
}) {
  const router = useRouter();
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FileEntry[] | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    const timeout = setTimeout(() => {
      if (!trimmed) {
        setSearchResults(null);
        return;
      }
      searchFiles(trimmed).then(setSearchResults);
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  function refresh() {
    router.refresh();
  }

  const isSearching = searchResults !== null;
  const isEmpty = !isSearching && subfolders.length === 0 && files.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <nav className="flex min-w-0 flex-wrap items-center gap-1 text-sm text-muted-foreground">
          <Link href="/drive" className="hover:text-foreground hover:underline">
            Todos os arquivos
          </Link>
          {breadcrumb.map((segment) => (
            <span key={segment.id} className="flex items-center gap-1">
              <span>/</span>
              <Link
                href={`/drive/${segment.id}`}
                className="hover:text-foreground hover:underline"
              >
                {segment.name}
              </Link>
            </span>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setTrashOpen(true)}>
            <Trash2Icon /> Lixeira
          </Button>
          <Button variant="outline" size="sm" onClick={() => setNewFolderOpen(true)}>
            <FolderPlusIcon /> Nova pasta
          </Button>
          <Button size="sm" onClick={() => setUploadOpen((v) => !v)}>
            <UploadIcon /> Upload
          </Button>
        </div>
      </div>

      <div className="relative w-full max-w-xs">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar arquivos em todo o Drive..."
          className="pl-8"
        />
        {query ? (
          <button
            type="button"
            aria-label="Limpar busca"
            onClick={() => setQuery("")}
            className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <XIcon className="size-4" />
          </button>
        ) : null}
      </div>

      {uploadOpen ? <UploadDropzone folderId={folderId} onUploaded={refresh} /> : null}

      {isSearching ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {searchResults.length} resultado{searchResults.length === 1 ? "" : "s"} para &quot;{query}&quot;
          </p>
          {searchResults.length === 0 ? (
            <EmptyState icon={SearchIcon} title="Nada encontrado" />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {searchResults.map((file) => (
                <FileCard key={file.id} file={file} onClick={() => setSelectedFile(file)} />
              ))}
            </div>
          )}
        </div>
      ) : isEmpty ? (
        <EmptyState
          icon={FolderOpenIcon}
          title="Pasta vazia"
          description="Crie uma pasta ou envie um arquivo para começar."
        />
      ) : (
        <div
          data-testid="drive-grid"
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {subfolders.map((folder) => (
            <FolderCard key={folder.id} folder={folder} currentPath={folderId} onChanged={refresh} />
          ))}
          {files.map((file) => (
            <FileCard key={file.id} file={file} onClick={() => setSelectedFile(file)} />
          ))}
        </div>
      )}

      <NewFolderDialog
        open={newFolderOpen}
        onOpenChange={setNewFolderOpen}
        parentId={folderId}
        onCreated={refresh}
      />
      <TrashDialog
        key={trashOpen ? "open" : "closed"}
        open={trashOpen}
        onOpenChange={setTrashOpen}
        onRestored={refresh}
      />
      <FilePreviewDialog
        key={selectedFile?.id ?? "none"}
        file={selectedFile}
        currentPath={folderId}
        onOpenChange={(open) => {
          if (!open) setSelectedFile(null);
        }}
        onChanged={refresh}
      />
    </div>
  );
}
