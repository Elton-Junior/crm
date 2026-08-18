"use client";

import { Suspense, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { MailIcon } from "lucide-react";
import { toast } from "sonner";

import { Logo } from "@/components/layout/Logo";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  requestPasswordReset,
  signInWithMagicLink,
  signInWithPassword,
  signUpWithPassword,
} from "@/features/auth/actions";
import { firstErrorMessage } from "@/lib/action-errors";
import { LoginHero } from "@/features/auth/components/LoginHero";
import { PasswordField } from "@/features/auth/components/PasswordField";
import {
  loginSchema,
  passwordLoginSchema,
  requestPasswordResetSchema,
  signUpSchema,
  type LoginInput,
  type PasswordLoginInput,
  type RequestPasswordResetInput,
  type SignUpInput,
} from "@/features/auth/schema";

const MAGIC_LINK_COOLDOWN_SECONDS = 60;

function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const form = useForm<RequestPasswordResetInput>({
    resolver: zodResolver(requestPasswordResetSchema),
    defaultValues: { email: "" },
  });

  function onSubmit(values: RequestPasswordResetInput) {
    startTransition(async () => {
      const result = await requestPasswordReset(values);
      if (!result.ok) {
        toast.error(firstErrorMessage(result.errors, "Não foi possível enviar o e-mail."));
        return;
      }
      setSent(true);
    });
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border bg-muted/40 p-6 text-center">
        <MailIcon className="size-6 text-primary" />
        <div>
          <p className="text-sm font-medium">Confira seu e-mail</p>
          <p className="text-sm text-muted-foreground">
            Se {form.getValues("email")} tiver uma conta, enviamos um link para
            criar uma nova senha.
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          Voltar para o login
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Redefinir senha</h2>
          <p className="text-sm text-muted-foreground">
            Digite seu e-mail e enviaremos um link para criar uma nova senha.
          </p>
        </div>

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
                  disabled={isPending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Enviando..." : "Enviar link"}
        </Button>
        <Button type="button" variant="ghost" className="w-full" onClick={onBack}>
          Voltar para o login
        </Button>
      </form>
    </Form>
  );
}

function SignInForm({ next }: { next?: string }) {
  const [isPending, startTransition] = useTransition();
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const form = useForm<PasswordLoginInput>({
    resolver: zodResolver(passwordLoginSchema),
    defaultValues: { email: "", password: "" },
  });

  function onSubmit(values: PasswordLoginInput) {
    startTransition(async () => {
      const result = await signInWithPassword(values, next);
      if (!result.ok) {
        toast.error(firstErrorMessage(result.errors, "Não foi possível entrar."));
        for (const [field, messages] of Object.entries(result.errors)) {
          if (field === "_form") continue;
          form.setError(field as keyof PasswordLoginInput, { message: messages?.[0] });
        }
        return;
      }

      toast.success("Login realizado.");
      window.location.href = result.data.redirectTo;
    });
  }

  if (showForgotPassword) {
    return <ForgotPasswordForm onBack={() => setShowForgotPassword(false)} />;
  }

  return (
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
                  disabled={isPending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <PasswordField
              field={field}
              label="Senha"
              autoComplete="current-password"
              disabled={isPending}
            />
          )}
        />

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowForgotPassword(true)}
            className="text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            Esqueceu a senha?
          </button>
        </div>

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Entrando..." : "Entrar"}
        </Button>
      </form>
    </Form>
  );
}

function SignUpForm({ next }: { next?: string }) {
  const [isPending, startTransition] = useTransition();
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const form = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  function onSubmit(values: SignUpInput) {
    startTransition(async () => {
      const result = await signUpWithPassword(values, next);
      if (!result.ok) {
        toast.error(firstErrorMessage(result.errors, "Não foi possível criar a conta."));
        for (const [field, messages] of Object.entries(result.errors)) {
          if (field === "_form") continue;
          form.setError(field as keyof SignUpInput, { message: messages?.[0] });
        }
        return;
      }

      if (result.data.confirmed) {
        toast.success("Conta criada.");
        window.location.href = result.data.redirectTo;
        return;
      }

      setAwaitingConfirmation(true);
      toast.success("Conta criada! Confira seu e-mail para confirmar.");
    });
  }

  if (awaitingConfirmation) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border bg-muted/40 p-6 text-center">
        <MailIcon className="size-6 text-primary" />
        <p className="text-sm font-medium">Confirme seu e-mail</p>
        <p className="text-sm text-muted-foreground">
          Enviamos um link de confirmação para {form.getValues("email")}. Clique
          nele para ativar sua conta.
        </p>
      </div>
    );
  }

  return (
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
                  disabled={isPending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <PasswordField
              field={field}
              label="Senha"
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
              label="Confirmar senha"
              autoComplete="new-password"
              disabled={isPending}
            />
          )}
        />

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Criando conta..." : "Criar conta"}
        </Button>
      </form>
    </Form>
  );
}

function MagicLinkForm({ next }: { next?: string }) {
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
        const message = result.errors.email?.[0] ?? "Não foi possível enviar o link.";
        form.setError("email", { message });
        toast.error(message);
        return;
      }

      setSent(true);
      setCooldown(MAGIC_LINK_COOLDOWN_SECONDS);
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
          variant="outline"
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
  );
}

function LoginContent() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? undefined;
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [showMagicLink, setShowMagicLink] = useState(false);

  return (
    <div className="flex min-h-screen">
      <LoginHero />

      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-16">
        <Logo className="lg:hidden" />

        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-1 text-center">
            <h1 className="text-2xl font-semibold">
              {mode === "signin" ? "Bem-vindo de volta" : "Criar conta"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {mode === "signin"
                ? "Entre com seu e-mail e senha para acessar o workspace."
                : "Cadastre-se com seu e-mail da empresa para começar."}
            </p>
          </div>

          <Tabs value={mode} onValueChange={(v) => setMode(v as "signin" | "signup")}>
            <TabsList className="w-full">
              <TabsTrigger value="signin" className="flex-1">
                Entrar
              </TabsTrigger>
              <TabsTrigger value="signup" className="flex-1">
                Criar conta
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {mode === "signin" ? <SignInForm next={next} /> : <SignUpForm next={next} />}

          {mode === "signin" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">ou</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              {showMagicLink ? (
                <MagicLinkForm next={next} />
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-muted-foreground"
                  onClick={() => setShowMagicLink(true)}
                >
                  <MailIcon />
                  Entrar com link mágico
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
