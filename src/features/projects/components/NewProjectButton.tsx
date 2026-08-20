"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

import { ProjectFormDialog } from "./ProjectFormDialog";

type Member = { id: string; full_name: string | null };

export function NewProjectButton({ members }: { members: Member[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <PlusIcon />
        Novo projeto
      </Button>
      <ProjectFormDialog
        key={open ? "open" : "closed"}
        open={open}
        onOpenChange={setOpen}
        projectId={null}
        members={members}
        onSuccess={(project) => router.push(`/projetos/${project.id}`)}
      />
    </>
  );
}
