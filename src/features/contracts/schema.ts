import { z } from "zod";

const CONTRACT_STATUSES = [
  "draft",
  "sent",
  "signed",
  "active",
  "expired",
  "cancelled",
] as const;
const SORTABLE_FIELDS = ["title", "end_date", "created_at"] as const;

export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  draft: "Rascunho",
  sent: "Enviado",
  signed: "Assinado",
  active: "Ativo",
  expired: "Vencido",
  cancelled: "Cancelado",
};

/**
 * searchParams vêm de uma URL — usamos `.catch()` em vez de rejeitar, então
 * um parâmetro inválido/adulterado só volta ao default (mesmo padrão do
 * clientListParamsSchema).
 */
export const contractListParamsSchema = z.object({
  q: z.string().trim().max(200).optional().catch(undefined),
  status: z.enum(CONTRACT_STATUSES).optional().catch(undefined),
  clientId: z.string().uuid().optional().catch(undefined),
  tag: z.string().trim().max(50).optional().catch(undefined),
  page: z.coerce.number().int().min(1).catch(1),
  sort: z.enum(SORTABLE_FIELDS).catch("created_at"),
  dir: z.enum(["asc", "desc"]).catch("desc"),
});

export type ContractListParams = z.infer<typeof contractListParamsSchema>;

/**
 * Sem `.default()` de propósito — mesmo motivo do clientFormSchema/
 * dealFormSchema: manter tipo de entrada == tipo de saída para
 * `useForm<ContractFormInput>({ resolver: zodResolver(...) })`.
 */
export const contractFormSchema = z
  .object({
    title: z.string().trim().min(1, "Informe um título.").max(200),
    contractNo: z.string().trim().max(100),
    clientId: z
      .string()
      .refine((v) => v === "" || z.string().uuid().safeParse(v).success, {
        message: "Cliente inválido.",
      }),
    dealId: z
      .string()
      .refine((v) => v === "" || z.string().uuid().safeParse(v).success, {
        message: "Proposta inválida.",
      }),
    status: z.enum(CONTRACT_STATUSES),
    // Reais, não centavos — convertido para centavos na Server Action.
    value: z
      .string()
      .trim()
      .refine((v) => v === "" || !Number.isNaN(Number(v.replace(",", "."))), {
        message: "Valor inválido.",
      }),
    startDate: z.string(),
    endDate: z.string(),
    signedAt: z.string(),
    renewalNoticeDays: z
      .string()
      .trim()
      .refine(
        (v) => v === "" || (!Number.isNaN(Number(v)) && Number(v) >= 0),
        { message: "Informe um número de dias válido." },
      ),
    notes: z.string().trim().max(5000),
    tags: z.array(z.string().trim().min(1)),
  })
  .refine(
    (data) => data.startDate === "" || data.endDate === "" || data.endDate >= data.startDate,
    { message: "A data de término deve ser depois do início.", path: ["endDate"] },
  );

export type ContractFormInput = z.infer<typeof contractFormSchema>;

export const CONTRACT_FORM_DEFAULTS: ContractFormInput = {
  title: "",
  contractNo: "",
  clientId: "",
  dealId: "",
  status: "draft",
  value: "",
  startDate: "",
  endDate: "",
  signedAt: "",
  renewalNoticeDays: "30",
  notes: "",
  tags: [],
};
