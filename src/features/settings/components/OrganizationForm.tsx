"use client";

import { useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

import { updateOrganization } from "../actions";
import { organizationFormSchema, type OrganizationFormInput } from "../schema";

export function OrganizationForm({ defaultValues }: { defaultValues: OrganizationFormInput }) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<OrganizationFormInput>({
    resolver: zodResolver(organizationFormSchema),
    defaultValues,
  });

  const logoUrl = useWatch({ control: form.control, name: "logoUrl" });
  const name = useWatch({ control: form.control, name: "name" });

  function onSubmit(values: OrganizationFormInput) {
    startTransition(async () => {
      const result = await updateOrganization(values);
      if (!result.ok) {
        for (const [field, messages] of Object.entries(result.errors)) {
          if (field === "_form") {
            toast.error(messages?.[0] ?? "Não foi possível salvar.");
            continue;
          }
          form.setError(field as keyof OrganizationFormInput, { message: messages?.[0] });
        }
        return;
      }
      toast.success("Organização atualizada.");
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar className="size-16 rounded-md">
            <AvatarImage src={logoUrl || undefined} alt="" className="object-contain" />
            <AvatarFallback className="rounded-md">{name?.[0]?.toUpperCase() ?? "O"}</AvatarFallback>
          </Avatar>
          <p className="text-xs text-muted-foreground">
            Cole a URL de uma imagem já hospedada para usar como logo.
          </p>
        </div>

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome da organização</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Nome da empresa" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="logoUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL do logo</FormLabel>
              <FormControl>
                <Input {...field} placeholder="https://..." />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="timezone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fuso horário</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="America/Sao_Paulo" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Moeda</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="BRL"
                    maxLength={3}
                    className="uppercase"
                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" disabled={isPending}>
          {isPending ? "Salvando..." : "Salvar organização"}
        </Button>
      </form>
    </Form>
  );
}
