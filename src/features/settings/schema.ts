import { z } from "zod";

const MEMBER_ROLES = ["owner", "admin", "member", "viewer"] as const;
export type MemberRoleOption = (typeof MEMBER_ROLES)[number];

export const MEMBER_ROLE_LABELS: Record<MemberRoleOption, string> = {
  owner: "Dono",
  admin: "Admin",
  member: "Membro",
  viewer: "Visualizador",
};

export const memberRoleSchema = z.enum(MEMBER_ROLES);

export const profileFormSchema = z.object({
  fullName: z.string().trim().min(1, "Informe seu nome.").max(200),
});
export type ProfileFormInput = z.infer<typeof profileFormSchema>;

export const organizationFormSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da organização.").max(200),
  logoUrl: z
    .string()
    .trim()
    .refine((v) => v === "" || /^https?:\/\//.test(v), { message: "URL inválida." }),
  timezone: z.string().trim().min(1, "Informe o fuso horário."),
  currency: z
    .string()
    .trim()
    .length(3, "Use o código de 3 letras (ex.: BRL)."),
});
export type OrganizationFormInput = z.infer<typeof organizationFormSchema>;

export const inviteMemberSchema = z.object({
  email: z.string().trim().email("E-mail inválido."),
  role: z.enum(MEMBER_ROLES),
});
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

/**
 * Sem `.default()` — mesmo motivo dos outros forms (useForm precisa que o
 * tipo de entrada bata com o de saída do resolver).
 */
export const stageFormSchema = z
  .object({
    name: z.string().trim().min(1, "Informe um nome.").max(60),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida."),
    wipLimit: z
      .string()
      .trim()
      .refine((v) => v === "" || (!Number.isNaN(Number(v)) && Number(v) >= 1), {
        message: "Informe um número válido.",
      }),
    isWon: z.boolean(),
    isLost: z.boolean(),
  })
  .refine((data) => !(data.isWon && data.isLost), {
    message: "Uma coluna não pode ser de ganho e de perda ao mesmo tempo.",
    path: ["isLost"],
  });
export type StageFormInput = z.infer<typeof stageFormSchema>;

export const STAGE_FORM_DEFAULTS: StageFormInput = {
  name: "",
  color: "#64748b",
  wipLimit: "",
  isWon: false,
  isLost: false,
};
