import { z } from "zod";

import { validarCNPJ, validarCPF } from "@/lib/validators";

const CLIENT_STATUSES = ["lead", "active", "inactive", "churned"] as const;
const SORTABLE_FIELDS = ["name", "created_at", "status"] as const;
const CLIENT_KINDS = ["pf", "pj"] as const;

export const BRAZIL_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
  "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
  "SP", "SE", "TO",
] as const;

/**
 * searchParams vêm de uma URL, não de um formulário — usamos `.catch()`
 * em vez de rejeitar, então um parâmetro inválido/adulterado só volta ao
 * default em vez de quebrar a página.
 */
export const clientListParamsSchema = z.object({
  q: z
    .string()
    .trim()
    .max(200)
    .optional()
    .catch(undefined),
  status: z.enum(CLIENT_STATUSES).optional().catch(undefined),
  ownerId: z.string().uuid().optional().catch(undefined),
  tag: z.string().trim().max(50).optional().catch(undefined),
  page: z.coerce.number().int().min(1).catch(1),
  sort: z.enum(SORTABLE_FIELDS).catch("created_at"),
  dir: z.enum(["asc", "desc"]).catch("desc"),
});

export type ClientListParams = z.infer<typeof clientListParamsSchema>;
export type ClientStatus = (typeof CLIENT_STATUSES)[number];

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  lead: "Lead",
  active: "Ativo",
  inactive: "Inativo",
  churned: "Churned",
};

export const SOURCE_OPTIONS = [
  "Indicação",
  "Site",
  "Evento",
  "Prospecção ativa",
  "Redes sociais",
  "Outro",
] as const;

const optionalText = (max: number) => z.string().trim().max(max);

/**
 * Schema do formulário de cliente — usado no cliente (react-hook-form) e na
 * Server Action (regra 6: mesma validação nas duas pontas). Campos ficam em
 * camelCase; o mapeamento para as colunas snake_case do banco é feito em
 * src/server/clients.ts.
 *
 * Sem `.default()` de propósito: isso faria o tipo de *entrada* do schema
 * ficar opcional e divergir do tipo de *saída* (`ClientFormInput`), o que
 * quebra `useForm<ClientFormInput>({ resolver: zodResolver(...) })`. Como o
 * formulário sempre envia o objeto completo (via `CLIENT_FORM_DEFAULTS`),
 * não precisamos de default no schema — só validação.
 */
export const clientFormSchema = z
  .object({
    kind: z.enum(CLIENT_KINDS),
    name: z.string().trim().min(1, "Informe o nome.").max(200),
    tradeName: optionalText(200),
    // Só dígitos — validado contra kind no superRefine abaixo.
    document: z.string().trim(),
    status: z.enum(CLIENT_STATUSES),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .max(200)
      .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
        message: "E-mail inválido.",
      }),
    // Só dígitos.
    phone: z.string().trim(),
    whatsapp: z.string().trim(),
    website: optionalText(200),
    // Só dígitos (8).
    zipCode: z
      .string()
      .trim()
      .refine((v) => v === "" || v.length === 8, { message: "CEP inválido." }),
    street: optionalText(200),
    number: optionalText(20),
    complement: optionalText(100),
    district: optionalText(100),
    city: optionalText(100),
    state: z
      .string()
      .trim()
      .toUpperCase()
      .refine(
        (v) => v === "" || (BRAZIL_STATES as readonly string[]).includes(v),
        { message: "UF inválida." },
      ),
    segment: optionalText(100),
    source: optionalText(50),
    ownerId: z
      .string()
      .refine((v) => v === "" || z.string().uuid().safeParse(v).success, {
        message: "Responsável inválido.",
      }),
    tags: z.array(z.string().trim().min(1)),
    notes: optionalText(5000),
  })
  .superRefine((data, ctx) => {
    if (!data.document) return;
    const isValid =
      data.kind === "pf" ? validarCPF(data.document) : validarCNPJ(data.document);
    if (!isValid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["document"],
        message: data.kind === "pf" ? "CPF inválido." : "CNPJ inválido.",
      });
    }
  });

export type ClientFormInput = z.infer<typeof clientFormSchema>;

export const CLIENT_FORM_DEFAULTS: ClientFormInput = {
  kind: "pj",
  name: "",
  tradeName: "",
  document: "",
  status: "lead",
  email: "",
  phone: "",
  whatsapp: "",
  website: "",
  zipCode: "",
  street: "",
  number: "",
  complement: "",
  district: "",
  city: "",
  state: "",
  segment: "",
  source: "",
  ownerId: "",
  tags: [],
  notes: "",
};
