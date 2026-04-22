import type { ApiFieldErrors, ProjectInput } from "../../shared/types.ts";

const PROJECT_LIMITS = {
  title: 80,
  description: 500,
  stack: 160,
  roles: 160,
} as const;

function validateLength(value: string, field: keyof typeof PROJECT_LIMITS, label: string, errors: ApiFieldErrors): void {
  if (value.trim().length > PROJECT_LIMITS[field]) {
    errors[field] = `${label} не должно превышать ${PROJECT_LIMITS[field]} символов`;
  }
}

export function createEmptyProjectInput(): ProjectInput {
  return {
    title: "",
    description: "",
    stack: "",
    roles: "",
  };
}

export function validateProjectInput(input: ProjectInput): ApiFieldErrors {
  const errors: ApiFieldErrors = {};

  if (!input.title.trim()) {
    errors.title = "Название проекта обязательно";
  }

  if (!input.description.trim()) {
    errors.description = "Опишите идею проекта";
  }

  validateLength(input.title, "title", "Название проекта", errors);
  validateLength(input.description, "description", "Описание", errors);
  validateLength(input.stack, "stack", "Стек", errors);
  validateLength(input.roles, "roles", "Роли", errors);

  return errors;
}
