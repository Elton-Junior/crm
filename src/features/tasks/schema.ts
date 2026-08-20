import { z } from "zod";

const TASK_STATUSES = ["todo", "in_progress", "review", "done", "cancelled"] as const;
export type TaskStatusOption = (typeof TASK_STATUSES)[number];

export const TASK_STATUS_LABELS: Record<TaskStatusOption, string> = {
  todo: "A fazer",
  in_progress: "Em andamento",
  review: "Revisão",
  done: "Concluída",
  cancelled: "Cancelada",
};

const TASK_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type TaskPriorityOption = (typeof TASK_PRIORITIES)[number];

export const TASK_PRIORITY_LABELS: Record<TaskPriorityOption, string> = {
  low: "Baixa",
  normal: "Normal",
  high: "Alta",
  urgent: "Urgente",
};

export const quickCreateTaskSchema = z.object({
  columnId: z.string().uuid(),
  title: z.string().trim().min(1, "Informe um título.").max(200),
  position: z.string().min(1),
});

export const moveTaskSchema = z.object({
  taskId: z.string().uuid(),
  toColumnId: z.string().uuid(),
  position: z.string().min(1),
});

export const moveColumnSchema = z.object({
  columnId: z.string().uuid(),
  position: z.string().min(1),
});

/** Sem `.default()` de propósito — mesmo motivo do dealFormSchema. */
export const taskFormSchema = z.object({
  title: z.string().trim().min(1, "Informe um título.").max(200),
  description: z.string().trim().max(5000),
  status: z.enum(TASK_STATUSES),
  priority: z.enum(TASK_PRIORITIES),
  assigneeId: z
    .string()
    .refine((v) => v === "" || z.string().uuid().safeParse(v).success, {
      message: "Responsável inválido.",
    }),
  startsOn: z.string(),
  dueOn: z.string(),
  estimateMin: z.number().int().min(0).nullable(),
  tags: z.array(z.string().trim().min(1)),
});

export type TaskFormInput = z.infer<typeof taskFormSchema>;

export const TASK_FORM_DEFAULTS: TaskFormInput = {
  title: "",
  description: "",
  status: "todo",
  priority: "normal",
  assigneeId: "",
  startsOn: "",
  dueOn: "",
  estimateMin: null,
  tags: [],
};
