"use client";

import { useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/button";
import { Form, FormField } from "@/components/ui/form";
import { updatePassword } from "@/features/auth/actions";
import { PasswordField } from "@/features/auth/components/PasswordField";
import { firstErrorMessage } from "@/lib/action-errors";
import {
  updatePasswordSchema,
  type UpdatePasswordInput,
} from "@/features/auth/schema";

export default function RedefinirSenhaPage() {
  const [isPending, startTransition] = useTransition();
  const form = useForm<UpdatePasswordInput>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  function onSubmit(values: UpdatePasswordInput) {
    startTransition(async () => {
      const result = await updatePassword(values);
      if (!result.ok) {
        toast.error(firstErrorMessage(result.errors, "Não foi possível atualizar a senha."));
        for (const [field, messages] of Object.entries(result.errors)) {
          if (field === "_form") continue;
          form.setError(field as keyof UpdatePasswordInput, { message: messages?.[0] });
        }
        return;
      }

      toast.success("Senha atualizada.");
      // Recarga completa (não router.push) para o shell autenticado ler a
      // sessão recém-atualizada em vez de reaproveitar cache de RSC.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/dashboard";
    });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-4 py-16">
      <Logo />
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold">Criar nova senha</h1>
          <p className="text-sm text-muted-foreground">
            Escolha uma nova senha para acessar sua conta.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <PasswordField
                  field={field}
                  label="Nova senha"
                  autoComplete="new-password"
                  disabled={isPending}
                />
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <PasswordField
                  field={field}
                  label="Confirmar nova senha"
                  autoComplete="new-password"
                  disabled={isPending}
                />
              )}
            />
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Salvando..." : "Salvar nova senha"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
