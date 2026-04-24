import { z } from "zod";

export const registerSchema = z
  .object({
    email: z.string().email().max(254).transform((s) => s.trim().toLowerCase()),
    name: z.string().trim().min(1, "Имя обязательно").max(80),
    password: z.string().min(6, "Пароль должен быть не короче 6 символов").max(128),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Пароль и подтверждение пароля не совпадают",
  });

export const loginSchema = z.object({
  email: z.string().min(1).transform((s) => s.trim().toLowerCase()),
  password: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
