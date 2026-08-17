import { ptBR } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";

const TIMEZONE = "America/Sao_Paulo";

/** Formata centavos (bigint/number) como moeda BRL. Nunca opere com float. */
export function formatCurrency(cents: number | bigint): string {
  const value = Number(cents) / 100;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/** Formata uma data (timestamptz ou date) no fuso America/Sao_Paulo. */
export function formatDate(
  date: string | Date,
  pattern = "dd/MM/yyyy",
): string {
  return formatInTimeZone(date, TIMEZONE, pattern, { locale: ptBR });
}

export function formatDateTime(date: string | Date): string {
  return formatDate(date, "dd/MM/yyyy 'às' HH:mm");
}

/** Formata CNPJ/CPF (só dígitos) com máscara. Não valida — ver validators.ts. */
export function formatDocument(digits: string): string {
  const d = digits.replace(/\D/g, "");
  if (d.length === 11) {
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  if (d.length === 14) {
    return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }
  return digits;
}

/** Formata CEP (8 dígitos) como 00000-000. */
export function formatZipCode(digits: string): string {
  const d = digits.replace(/\D/g, "");
  if (d.length === 8) {
    return d.replace(/(\d{5})(\d{3})/, "$1-$2");
  }
  return digits;
}

/** Formata bytes como KB/MB legível. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Formata telefone/celular (10 ou 11 dígitos, com DDD). */
export function formatPhone(digits: string): string {
  const d = digits.replace(/\D/g, "");
  if (d.length === 11) {
    return d.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  }
  if (d.length === 10) {
    return d.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }
  return digits;
}
