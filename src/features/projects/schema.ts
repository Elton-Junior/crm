import { z } from "zod";

const PROJECT_STATUSES = ["active", "on_hold", "done", "archived"] as const;
export type ProjectStatusOption = (typeof PROJECT_STATUSES)[number];

export const PROJECT_STATUS_LABELS: Record<ProjectStatusOption, string> = {
  active: "Ativo",
  on_hold: "Em pausa",
  done: "Concluído",
  archived: "Arquivado",
};

export const projectListParamsSchema = z.object({
  q: z.string().trim().max(200).optional().catch(undefined),
  status: z.enum(PROJECT_STATUSES).optional().catch(undefined),
  clientId: z.string().uuid().optional().catch(undefined),
});

export type ProjectListParams = z.infer<typeof projectListParamsSchema>;

/** Sem `.default()` de propósito — mesmo motivo do clientFormSchema/eventFormSchema. */
export const projectFormSchema = z
  .object({
    name: z.string().trim().min(1, "Informe o nome.").max(200),
    description: z.string().trim().max(2000),
    color: z.string().trim().min(1),
    status: z.enum(PROJECT_STATUSES),
    clientId: z
      .string()
      .refine((v) => v === "" || z.string().uuid().safeParse(v).success, {
        message: "Cliente inválido.",
      }),
    ownerId: z
      .string()
      .refine((v) => v === "" || z.string().uuid().safeParse(v).success, {
        message: "Responsável inválido.",
      }),
    startsOn: z.string(),
    dueOn: z.string(),
    memberIds: z.array(z.string().uuid()),
  })
  .refine((data) => !data.startsOn || !data.dueOn || data.dueOn >= data.startsOn, {
    message: "O prazo deve ser depois do início.",
    path: ["dueOn"],
  });

export type ProjectFormInput = z.infer<typeof projectFormSchema>;

export const PROJECT_COLOR_OPTIONS = [
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#22c55e",
  "#06b6d4",
  "#64748b",
] as const;

export const PROJECT_FORM_DEFAULTS: ProjectFormInput = {
  name: "",
  description: "",
  color: PROJECT_COLOR_OPTIONS[0],
  status: "active",
  clientId: "",
  ownerId: "",
  startsOn: "",
  dueOn: "",
  memberIds: [],
};
