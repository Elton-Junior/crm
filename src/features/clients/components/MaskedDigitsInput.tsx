"use client";

import type { ComponentProps } from "react";

import { Input } from "@/components/ui/input";

type MaskedDigitsInputProps = {
  value: string;
  onChange: (digits: string) => void;
  format: (digits: string) => string;
  maxDigits: number;
} & Omit<ComponentProps<typeof Input>, "value" | "onChange">;

/**
 * Guarda só os dígitos no form state (é o que o banco espera) e formata
 * apenas para exibição. A máscara final só "fecha" quando o comprimento
 * bate — enquanto o usuário digita, mostra os dígitos crus.
 */
export function MaskedDigitsInput({
  value,
  onChange,
  format,
  maxDigits,
  ...props
}: MaskedDigitsInputProps) {
  return (
    <Input
      {...props}
      inputMode="numeric"
      value={format(value)}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, "").slice(0, maxDigits);
        onChange(digits);
      }}
    />
  );
}
