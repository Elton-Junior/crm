"use client";

import { useRef, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { firstErrorMessage } from "@/lib/action-errors";
import { createClient } from "@/lib/supabase/client";

import { confirmAvatarUpload, createAvatarUploadUrl, updateProfile } from "../actions";
import { profileFormSchema, type ProfileFormInput } from "../schema";

const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_FILE_SIZE = 2 * 1024 * 1024;

function initials(name: string, email: string) {
  const source = name.trim() || email;
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function ProfileForm({
  email,
  defaultValues,
  avatarUrl,
}: {
  email: string;
  defaultValues: ProfileFormInput;
  avatarUrl: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState(avatarUrl);
  const inputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ProfileFormInput>({
    resolver: zodResolver(profileFormSchema),
    defaultValues,
  });

  async function handleAvatarFile(file: File) {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      toast.error("Use PNG, JPEG ou WEBP.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Imagem maior que 2 MB.");
      return;
    }

    setIsUploading(true);
    const urlResult = await createAvatarUploadUrl({
      fileName: file.name,
      mime: file.type,
      size: file.size,
    });
    if (!urlResult.ok) {
      setIsUploading(false);
      toast.error(firstErrorMessage(urlResult.errors, "Não foi possível iniciar o upload."));
      return;
    }

    const supabase = createClient();
    const { error: uploadErr } = await supabase.storage
      .from("avatars")
      .uploadToSignedUrl(urlResult.data.path, urlResult.data.token, file);
    if (uploadErr) {
      setIsUploading(false);
      toast.error("Falha ao enviar a imagem. Tente de novo.");
      return;
    }

    const confirmResult = await confirmAvatarUpload(urlResult.data.path);
    setIsUploading(false);

    if (!confirmResult.ok) {
      toast.error(firstErrorMessage(confirmResult.errors, "Upload feito, mas não foi salvo."));
      return;
    }

    setPreview(confirmResult.data.avatarUrl);
    toast.success("Foto atualizada.");
  }

  function onSubmit(values: ProfileFormInput) {
    startTransition(async () => {
      const result = await updateProfile(values);
      if (!result.ok) {
        toast.error(firstErrorMessage(result.errors, "Não foi possível salvar."));
        return;
      }
      toast.success("Perfil atualizado.");
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Avatar className="size-16">
          <AvatarImage src={preview || undefined} alt="" />
          <AvatarFallback>{initials(defaultValues.fullName, email)}</AvatarFallback>
        </Avatar>
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isUploading}
            onClick={() => inputRef.current?.click()}
          >
            {isUploading ? "Enviando..." : "Trocar foto"}
          </Button>
          <p className="mt-1 text-xs text-muted-foreground">PNG, JPEG ou WEBP · máx. 2 MB</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_MIME_TYPES.join(",")}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleAvatarFile(file);
            e.target.value = "";
          }}
        />
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormItem>
            <FormLabel>E-mail</FormLabel>
            <Input value={email} disabled readOnly />
          </FormItem>

          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome completo</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Seu nome" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={isPending}>
            {isPending ? "Salvando..." : "Salvar perfil"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
