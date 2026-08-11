"use client";

import { Suspense, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

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
import { signInWithMagicLink } from "@/features/auth/actions";
import { loginSchema, type LoginInput } from "@/features/auth/schema";

const COOLDOWN_SECONDS = 60;

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? undefined;

  const [isPending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "" },
  });

  function onSubmit(values: LoginInput) {
    startTransition(async () => {
      const result = await signInWithMagicLink(values, next);

      if (!result.ok) {
        const message =
          result.errors.email?.[0] ?? "Não foi possível enviar o link.";
        form.setError("email", { message });
        toast.error(message);
        return;
      }

      setSent(true);
      setCooldown(COOLDOWN_SECONDS);
      toast.success("Link enviado! Confira seu e-mail.");

      const interval = setInterval(() => {
        setCooldown((current) => {
          if (current <= 1) {
            clearInterval(interval);
            return 0;
          }
          return current - 1;
        });
      }, 1000);
    });
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold">Entrar</h1>
          <p className="text-sm text-muted-foreground">
            Digite seu e-mail e enviamos um link mágico de acesso.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="voce@suaempresa.com.br"
                      autoComplete="email"
                      disabled={isPending || cooldown > 0}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={isPending || cooldown > 0}
            >
              {cooldown > 0
                ? `Reenviar em ${cooldown}s`
                : isPending
                  ? "Enviando..."
                  : sent
                    ? "Reenviar link"
                    : "Enviar link mágico"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
