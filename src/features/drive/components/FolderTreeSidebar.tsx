"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronRightIcon, FolderIcon, HardDriveIcon, LockIcon } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { getPrivateFolder, listSubfolders } from "../actions";

type FolderNode = { id: string; name: string; parent_id: string | null; is_private: boolean };

function activeIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/drive\/([^/]+)/);
  return match ? match[1] : null;
}

function FolderTreeItem({
  folder,
  depth,
  activeFolderId,
}: {
  folder: FolderNode;
  depth: number;
  activeFolderId: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<FolderNode[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function toggle() {
    if (!expanded && children === null) {
      setIsLoading(true);
      const kids = await listSubfolders(folder.id);
      setChildren(kids);
      setIsLoading(false);
    }
    setExpanded((e) => !e);
  }

  return (
    <div>
      <div className="flex items-center gap-0.5" style={{ paddingLeft: depth * 14 }}>
        <button
          type="button"
          onClick={toggle}
          aria-label={expanded ? `Recolher ${folder.name}` : `Expandir ${folder.name}`}
          className="shrink-0 rounded-sm p-0.5 text-muted-foreground hover:bg-accent"
        >
          <ChevronRightIcon className={cn("size-3.5 transition-transform", expanded && "rotate-90")} />
        </button>
        <Link
          href={`/drive/${folder.id}`}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-1.5 py-1 text-sm hover:bg-accent",
            activeFolderId === folder.id && "bg-accent font-medium",
          )}
        >
          <FolderIcon className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate">{folder.name}</span>
        </Link>
      </div>
      {expanded ? (
        isLoading ? (
          <div style={{ paddingLeft: (depth + 1) * 14 }} className="py-1">
            <Skeleton className="h-5 w-32" />
          </div>
        ) : children && children.length > 0 ? (
          children.map((child) => (
            <FolderTreeItem
              key={child.id}
              folder={child}
              depth={depth + 1}
              activeFolderId={activeFolderId}
            />
          ))
        ) : null
      ) : null}
    </div>
  );
}

export function FolderTreeSidebar({ rootFolders }: { rootFolders: FolderNode[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const activeFolderId = activeIdFromPath(pathname);

  async function goToPrivateFolder() {
    const folder = await getPrivateFolder();
    router.push(`/drive/${folder.id}`);
  }

  return (
    <nav className="w-56 shrink-0 space-y-3">
      <div className="space-y-0.5">
        <Link
          href="/drive"
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm hover:bg-accent",
            activeFolderId === null && "bg-accent font-medium",
          )}
        >
          <HardDriveIcon className="size-4 text-muted-foreground" />
          Todos os arquivos
        </Link>
        {rootFolders.map((folder) => (
          <FolderTreeItem key={folder.id} folder={folder} depth={1} activeFolderId={activeFolderId} />
        ))}
      </div>

      <button
        type="button"
        onClick={goToPrivateFolder}
        className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-accent"
      >
        <LockIcon className="size-4" />
        Privado
      </button>
    </nav>
  );
}
