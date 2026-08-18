"use client";

import { useState } from "react";
import {
  type ControllerRenderProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import { EyeIcon, EyeOffIcon } from "lucide-react";

import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

export function PasswordField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  field,
  label,
  autoComplete,
  disabled,
}: {
  field: ControllerRenderProps<TFieldValues, TName>;
  label: string;
  autoComplete: string;
  disabled?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <FormItem>
      <FormLabel>{label}</FormLabel>
      <div className="relative">
        <FormControl>
          <Input
            type={visible ? "text" : "password"}
            autoComplete={autoComplete}
            disabled={disabled}
            className="pr-9"
            {...field}
          />
        </FormControl>
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
          tabIndex={-1}
        >
          {visible ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
        </button>
      </div>
      <FormMessage />
    </FormItem>
  );
}
