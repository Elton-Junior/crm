import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "Informe seu e-mail").email("E-mail inválido"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const passwordLoginSchema = z.object({
  email: z.string().min(1, "Informe seu e-mail").email("E-mail inválido"),
  password: z.string().min(1, "Informe sua senha"),
});

export type PasswordLoginInput = z.infer<typeof passwordLoginSchema>;

export const signUpSchema = z
  .object({
    email: z.string().min(1, "Informe seu e-mail").email("E-mail inválido"),
    password: z.string().min(8, "Mínimo de 8 caracteres"),
    confirmPassword: z.string().min(1, "Confirme sua senha"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  });

export type SignUpInput = z.infer<typeof signUpSchema>;

export const requestPasswordResetSchema = z.object({
  email: z.string().min(1, "Informe seu e-mail").email("E-mail inválido"),
});

export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>;

export const updatePasswordSchema = z
  .object({
    password: z.string().min(8, "Mínimo de 8 caracteres"),
    confirmPassword: z.string().min(1, "Confirme sua senha"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  });

export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
