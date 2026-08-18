"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { firstErrorMessage } from "@/lib/action-errors";

import { inviteMember, removeMember, updateMemberRole } from "../actions";
import {
  MEMBER_ROLE_LABELS,
  inviteMemberSchema,
  type InviteMemberInput,
  type MemberRoleOption,
} from "../schema";

export type TeamMemberRow = {
  membershipId: string;
  userId: string;
  fullName: string | null;
  email: string;
  role: MemberRoleOption;
};

const ROLE_OPTIONS = Object.entries(MEMBER_ROLE_LABELS) as [MemberRoleOption, string][];

function initials(name: string | null, email: string) {
  const source = name?.trim() || email;
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function TeamPanel({
  members,
  currentUserId,
  canManage,
}: {
  members: TeamMemberRow[];
  currentUserId: string;
  canManage: boolean;
}) {
  return (
    <div className="space-y-6">
      {canManage && <InviteMemberForm />}

      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Membro</TableHead>
              <TableHead>Papel</TableHead>
              {canManage && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <MemberRow
                key={member.membershipId}
                member={member}
                canManage={canManage}
                isSelf={member.userId === currentUserId}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function InviteMemberForm() {
  const [isPending, startTransition] = useTransition();
  const form = useForm<InviteMemberInput>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: { email: "", role: "member" },
  });

  function onSubmit(values: InviteMemberInput) {
    startTransition(async () => {
      const result = await inviteMember(values);
      if (!result.ok) {
        toast.error(firstErrorMessage(result.errors, "Não foi possível convidar."));
        return;
      }
      toast.success("Convite enviado.");
      form.reset({ email: "", role: values.role });
    });
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-wrap items-end gap-3 rounded-md border p-4"
      >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem className="min-w-[220px] flex-1">
              <FormLabel>Convidar por e-mail</FormLabel>
              <FormControl>
                <Input {...field} type="email" placeholder="pessoa@empresa.com" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Papel</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {ROLE_OPTIONS.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isPending}>
          {isPending ? "Convidando..." : "Convidar"}
        </Button>
      </form>
    </Form>
  );
}

function MemberRow({
  member,
  canManage,
  isSelf,
}: {
  member: TeamMemberRow;
  canManage: boolean;
  isSelf: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const canEditThisRow = canManage && !(isSelf && member.role === "owner");

  function handleRoleChange(role: string) {
    startTransition(async () => {
      const result = await updateMemberRole(member.membershipId, role);
      if (!result.ok) {
        toast.error(firstErrorMessage(result.errors, "Não foi possível trocar o papel."));
        return;
      }
      toast.success("Papel atualizado.");
    });
  }

  function handleRemove() {
    startTransition(async () => {
      const result = await removeMember(member.membershipId);
      if (!result.ok) {
        toast.error(firstErrorMessage(result.errors, "Não foi possível remover."));
        return;
      }
      toast.success("Membro removido.");
      setConfirmOpen(false);
    });
  }

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar className="size-8">
            <AvatarFallback className="text-xs">
              {initials(member.fullName, member.email)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">{member.fullName || member.email}</p>
            {member.fullName && (
              <p className="text-xs text-muted-foreground">{member.email}</p>
            )}
          </div>
          {isSelf && <Badge variant="secondary">Você</Badge>}
        </div>
      </TableCell>
      <TableCell>
        {canEditThisRow ? (
          <Select value={member.role} onValueChange={handleRoleChange} disabled={isPending}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Badge variant="outline">{MEMBER_ROLE_LABELS[member.role]}</Badge>
        )}
      </TableCell>
      {canManage && (
        <TableCell>
          {canEditThisRow && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => setConfirmOpen(true)}
              >
                Remover
              </Button>
              <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Remover {member.fullName || member.email}?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      A pessoa perde acesso imediatamente a esta organização.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={(e) => {
                        e.preventDefault();
                        handleRemove();
                      }}
                      disabled={isPending}
                      className="bg-destructive text-white hover:bg-destructive/90"
                    >
                      {isPending ? "Removendo..." : "Remover"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </TableCell>
      )}
    </TableRow>
  );
}
