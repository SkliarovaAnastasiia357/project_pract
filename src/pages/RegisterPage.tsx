import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { validateRegistrationForm } from "../features/auth/forms.ts";
import { ApiClientError } from "../shared/api/contracts.ts";
import { AuthSplitLayout } from "../shared/components/AuthSplitLayout.tsx";
import { FieldShell } from "../shared/components/FieldShell.tsx";
import { StatusBanner } from "../shared/components/StatusBanner.tsx";
import type { RegisterInput } from "../shared/types.ts";
import { useAuth } from "../app/providers/AuthProvider.tsx";

const initialRegistrationForm: RegisterInput = {
  email: "",
  name: "",
  password: "",
  confirmPassword: "",
};

export function RegisterPage() {
  const navigate = useNavigate();
  const { register, status } = useAuth();
  const [form, setForm] = useState<RegisterInput>(initialRegistrationForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [pending, setPending] = useState(false);

  if (status === "authenticated") {
    return <Navigate to="/home" replace />;
  }

  function updateField<Key extends keyof RegisterInput>(key: Key, value: RegisterInput[Key]) {
    setForm((currentForm) => ({
      ...currentForm,
      [key]: value,
    }));
    setErrors((currentErrors) => ({
      ...currentErrors,
      [key]: "",
    }));
    setSubmitError("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationErrors = validateRegistrationForm(form);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setPending(true);

    try {
      await register(form);
      navigate("/home", {
        replace: true,
        state: {
          flash: {
            tone: "success",
            title: "Профиль создан",
            message: "Аккаунт активирован. Теперь заполните описание, навыки и создайте первый проект.",
          },
        },
      });
    } catch (error) {
      if (error instanceof ApiClientError) {
        setErrors(error.fieldErrors ?? {});
        setSubmitError(error.message);
      } else {
        setSubmitError("Не удалось завершить регистрацию. Попробуйте ещё раз.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthSplitLayout
      eyebrow="Sprint 2 / user onboarding"
      title="Создайте аккаунт и соберите свой профиль"
      description="Регистрация сразу открывает доступ к защищенным маршрутам, профилю и проектам. После создания аккаунта вы автоматически войдете в рабочую зону."
      helperLabel="Войти"
      helperPath="/login"
      helperText="Уже есть аккаунт?"
    >
      <div className="form-surface__header">
        <p className="form-surface__eyebrow">Регистрация</p>
        <h2>Новый аккаунт</h2>
        <p>Используйте рабочий email и задайте пароль не короче шести символов.</p>
      </div>

      {submitError ? <StatusBanner tone="error" title="Ошибка регистрации" message={submitError} /> : null}

      <form className="form-surface" onSubmit={handleSubmit}>
        <FieldShell error={errors.email} label="Email">
          <input
            autoComplete="email"
            className="text-input"
            name="email"
            onChange={(event) => updateField("email", event.target.value)}
            placeholder="you@teamnova.app"
            type="email"
            value={form.email}
          />
        </FieldShell>

        <FieldShell error={errors.name} label="Имя">
          <input
            autoComplete="name"
            className="text-input"
            name="name"
            onChange={(event) => updateField("name", event.target.value)}
            placeholder="Как к вам обращаться"
            type="text"
            value={form.name}
          />
        </FieldShell>

        <FieldShell error={errors.password} label="Пароль">
          <input
            autoComplete="new-password"
            className="text-input"
            name="password"
            onChange={(event) => updateField("password", event.target.value)}
            placeholder="Минимум 6 символов"
            type="password"
            value={form.password}
          />
        </FieldShell>

        <FieldShell error={errors.confirmPassword} label="Подтверждение пароля">
          <input
            autoComplete="new-password"
            className="text-input"
            name="confirmPassword"
            onChange={(event) => updateField("confirmPassword", event.target.value)}
            placeholder="Повторите пароль"
            type="password"
            value={form.confirmPassword}
          />
        </FieldShell>

        <button className="primary-button" disabled={pending} type="submit">
          {pending ? "Создаем аккаунт…" : "Зарегистрироваться"}
        </button>
      </form>

      <p className="form-surface__footer">
        Уже регистрировались? <Link to="/login">Открыть вход</Link>
      </p>
    </AuthSplitLayout>
  );
}
