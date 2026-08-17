export type ActionErrors = Record<string, string[] | undefined> | { _form: string[] };

/**
 * Server Actions retornam `errors` como o `fieldErrors` do Zod (uma chave
 * por campo) OU `{ _form: [...] }` (erro vindo do service, sem campo
 * específico). Essa união faz o TS recusar `errors._form` direto — este
 * helper resolve a mensagem de erro nos dois casos.
 */
export function firstErrorMessage(errors: ActionErrors, fallback: string): string {
  if ("_form" in errors) return errors._form?.[0] ?? fallback;
  for (const value of Object.values(errors)) {
    if (value && value.length > 0) return value[0];
  }
  return fallback;
}
