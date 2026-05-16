import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { validateLoginForm } from "../features/auth/forms.ts";
import { ApiClientError } from "../shared/api/contracts.ts";
import { AuthSplitLayout } from "../shared/components/AuthSplitLayout.tsx";
import { FieldShell } from "../shared/components/FieldShell.tsx";
import { StatusBanner } from "../shared/components/StatusBanner.tsx";
import type { LoginInput } from "../shared/types.ts";
import { useAuth } from "../app/providers/AuthProvider.tsx";

const initialLoginForm: LoginInput = {
  email: "",
  password: "",
};

export function LoginPage() {
  const navigate = useNavigate();
  const { login, status } = useAuth();
  const [form, setForm] = useState<LoginInput>(initialLoginForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [pending, setPending] = useState(false);

  if (status === "authenticated") {
    return <Navigate to="/home" replace />;
  }

  function updateField<Key extends keyof LoginInput>(key: Key, value: LoginInput[Key]) {
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

    const validationErrors = validateLoginForm(form);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setPending(true);

    try {
      await login(form);
      navigate("/home", {
        replace: true,
        state: {
          flash: {
            tone: "success",
            title: "Вход выполнен",
            message: "Сессия активна, можно продолжать работу над профилем и проектами.",
          },
        },
      });
    } catch (error) {
      if (error instanceof ApiClientError) {
        setErrors(error.fieldErrors ?? {});
        setSubmitError(error.message);
      } else {
        setSubmitError("Не удалось выполнить вход. Попробуйте ещё раз.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthSplitLayout
      eyebrow="Teamnova · финальный MVP"
      title="Войдите в рабочую среду Teamnova"
      description="Используйте аккаунт, чтобы открыть профиль, навыки и проекты. Состояние сессии сохраняется локально и сразу защищает маршруты приложения."
      helperLabel="Создать аккаунт"
      helperPath="/register"
      helperText="Еще нет профиля?"
    >
      <div className="form-surface__header">
        <p className="form-surface__eyebrow">Авторизация</p>
        <h2>Войти</h2>
        <p>После входа вы попадете в рабочую зону с проектами и профилем.</p>
      </div>

      {submitError ? <StatusBanner tone="error" title="Ошибка входа" message={submitError} /> : null}

      <form className="form-surface" onSubmit={handleSubmit}>
        <FieldShell error={errors.email} label="Email">
          <input
            autoComplete="email"
            className="text-input"
            name="email"
            onChange={(event) => updateField("email", event.target.value)}
            placeholder="student@example.com"
            type="email"
            value={form.email}
          />
        </FieldShell>

        <FieldShell error={errors.password} label="Пароль">
          <input
            autoComplete="current-password"
            className="text-input"
            name="password"
            onChange={(event) => updateField("password", event.target.value)}
            placeholder="Введите пароль"
            type="password"
            value={form.password}
          />
        </FieldShell>

        <button className="primary-button" disabled={pending} type="submit">
          {pending ? "Проверяем данные…" : "Войти"}
        </button>
      </form>

      <p className="form-surface__footer">
        Нужен новый аккаунт? <Link to="/register">Открыть регистрацию</Link>
      </p>
    </AuthSplitLayout>
  );
}
