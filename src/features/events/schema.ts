import { z } from "zod";

const EVENT_KINDS = ["meeting", "call", "task", "deadline", "other"] as const;
export type EventKindOption = (typeof EVENT_KINDS)[number];

export const EVENT_KIND_LABELS: Record<EventKindOption, string> = {
  meeting: "Reunião",
  call: "Ligação",
  task: "Tarefa",
  deadline: "Prazo",
  other: "Outro",
};

const RECURRENCE_OPTIONS = ["none", "daily", "weekly", "monthly"] as const;
export type RecurrenceOption = (typeof RECURRENCE_OPTIONS)[number];

export const RECURRENCE_LABELS: Record<RecurrenceOption, string> = {
  none: "Não repete",
  daily: "Diária",
  weekly: "Semanal",
  monthly: "Mensal",
};

/** Recorrência simples do MVP — só as 3 frequências, sem COUNT/UNTIL (§7.8). */
export function recurrenceToRrule(option: RecurrenceOption): string {
  switch (option) {
    case "daily":
      return "FREQ=DAILY";
    case "weekly":
      return "FREQ=WEEKLY";
    case "monthly":
      return "FREQ=MONTHLY";
    default:
      return "";
  }
}

export function rruleToRecurrence(rrule: string): RecurrenceOption {
  if (rrule.includes("FREQ=DAILY")) return "daily";
  if (rrule.includes("FREQ=WEEKLY")) return "weekly";
  if (rrule.includes("FREQ=MONTHLY")) return "monthly";
  return "none";
}

/**
 * Sem `.default()` de propósito — mesmo motivo do clientFormSchema/
 * dealFormSchema/contractFormSchema.
 */
export const eventFormSchema = z
  .object({
    title: z.string().trim().min(1, "Informe um título.").max(200),
    kind: z.enum(EVENT_KINDS),
    startsAt: z.string().min(1, "Informe o início."),
    endsAt: z.string().min(1, "Informe o fim."),
    allDay: z.boolean(),
    location: z.string().trim().max(300),
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
    ownerId: z
      .string()
      .refine((v) => v === "" || z.string().uuid().safeParse(v).success, {
        message: "Responsável inválido.",
      }),
    attendeeIds: z.array(z.string().uuid()),
    description: z.string().trim().max(2000),
    recurrence: z.enum(RECURRENCE_OPTIONS),
  })
  .refine((data) => data.endsAt >= data.startsAt, {
    message: "O fim deve ser depois do início.",
    path: ["endsAt"],
  });

export type EventFormInput = z.infer<typeof eventFormSchema>;

export const EVENT_FORM_DEFAULTS: EventFormInput = {
  title: "",
  kind: "meeting",
  startsAt: "",
  endsAt: "",
  allDay: false,
  location: "",
  clientId: "",
  dealId: "",
  ownerId: "",
  attendeeIds: [],
  description: "",
  recurrence: "none",
};
