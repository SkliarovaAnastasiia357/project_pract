import type { ApiFieldErrors, LoginInput, RegisterInput } from "../../shared/types.ts";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const registrationFields = ["Email", "Имя", "Пароль", "Подтверждение пароля"] as const;
export const loginFields = ["Email", "Пароль"] as const;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateRegistrationForm(input: RegisterInput): ApiFieldErrors {
  const errors: ApiFieldErrors = {};

  if (!emailPattern.test(normalizeEmail(input.email))) {
    errors.email = "Некорректный формат email";
  }

  if (!input.name.trim()) {
    errors.name = "Введите имя";
  }

  if (input.password.length < 6) {
    errors.password = "Пароль должен быть не короче 6 символов";
  }

  if (input.password !== input.confirmPassword) {
    errors.confirmPassword = "Пароль и подтверждение пароля не совпадают";
  }

  return errors;
}

export function validateLoginForm(input: LoginInput): ApiFieldErrors {
  const errors: ApiFieldErrors = {};

  if (!emailPattern.test(normalizeEmail(input.email))) {
    errors.email = "Некорректный формат email";
  }

  if (!input.password.trim()) {
    errors.password = "Введите пароль";
  }

  return errors;
}
