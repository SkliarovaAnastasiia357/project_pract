import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { AppShell } from "../app/AppShell.tsx";
import { useAuth } from "../app/providers/AuthProvider.tsx";
import { createEmptyProjectInput, validateProjectInput } from "../features/projects/project-form.ts";
import { apiClient } from "../shared/api/index.ts";
import { ApiClientError } from "../shared/api/contracts.ts";
import { FieldShell } from "../shared/components/FieldShell.tsx";
import { LoadingBlock } from "../shared/components/LoadingBlock.tsx";
import { StatusBanner } from "../shared/components/StatusBanner.tsx";
import type { ProjectInput } from "../shared/types.ts";

export function ProjectEditorPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { session } = useAuth();
  const isEditMode = Boolean(id);
  const [form, setForm] = useState<ProjectInput>(createEmptyProjectInput());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(isEditMode);
  const [submitError, setSubmitError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadProject() {
      if (!session || !id) {
        return;
      }

      setLoading(true);
      setSubmitError("");

      try {
        const project = await apiClient.getProject(session.token, id);

        if (cancelled) {
          return;
        }

        setForm({
          title: project.title,
          description: project.description,
          stack: project.stack,
          roles: project.roles,
        });
      } catch (error) {
        if (!cancelled) {
          setSubmitError(error instanceof ApiClientError ? error.message : "Не удалось загрузить проект.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadProject();

    return () => {
      cancelled = true;
    };
  }, [id, session]);

  function updateField<Key extends keyof ProjectInput>(key: Key, value: ProjectInput[Key]) {
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

    if (!session) {
      return;
    }

    const validationErrors = validateProjectInput(form);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setPending(true);
    setSubmitError("");

    try {
      if (isEditMode && id) {
        await apiClient.updateProject(session.token, id, form);
      } else {
        await apiClient.createProject(session.token, form);
      }

      navigate("/home", {
        replace: true,
        state: {
          flash: {
            tone: "success",
            title: isEditMode ? "Проект обновлен" : "Проект создан",
            message: isEditMode
              ? "Изменения сохранены и уже видны на главной странице."
              : "Новый проект добавлен в рабочую зону.",
          },
        },
      });
    } catch (error) {
      if (error instanceof ApiClientError) {
        setErrors(error.fieldErrors ?? {});
        setSubmitError(error.message);
      } else {
        setSubmitError("Не удалось сохранить проект.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <AppShell
      title={isEditMode ? "Редактирование проекта" : "Новый проект"}
      description="Форма использует единый контракт с backend и mock API: обязательные поля, ошибки формы и переход назад в рабочую зону."
      actions={
        <Link className="ghost-button" to="/home">
          Вернуться на главную
        </Link>
      }
      aside={
        <div className="sidebar-stack">
          <article className="sidebar-card">
            <p className="sidebar-card__eyebrow">Предпросмотр</p>
            <h3>{form.title || "Название проекта"}</h3>
            <p>{form.description || "Здесь появится краткое описание вашего проекта."}</p>
            <dl className="metric-list">
              <div>
                <dt>Стек</dt>
                <dd>{form.stack || "Не заполнен"}</dd>
              </div>
              <div>
                <dt>Роли</dt>
                <dd>{form.roles || "Не заполнены"}</dd>
              </div>
            </dl>
          </article>

          <article className="sidebar-card sidebar-card--accent">
            <p className="sidebar-card__eyebrow">Подсказка</p>
            <h3>Пишите конкретно</h3>
            <p>Чем яснее описаны стек и роли, тем легче тестировщику и будущим участникам проверять сценарии.</p>
          </article>
        </div>
      }
    >
      <section className="panel">
        <div className="panel__header">
          <div>
            <p className="panel__eyebrow">Карточка проекта</p>
            <h2>{isEditMode ? "Обновить проект" : "Создать проект"}</h2>
          </div>
        </div>

        {submitError ? <StatusBanner message={submitError} tone="error" /> : null}

        {loading ? (
          <LoadingBlock label="Загружаем проект для редактирования…" />
        ) : (
          <form className="content-stack" onSubmit={handleSubmit}>
            <FieldShell error={errors.title} label="Название проекта">
              <input
                className="text-input"
                name="title"
                onChange={(event) => updateField("title", event.target.value)}
                placeholder="Платформа поиска команды"
                type="text"
                value={form.title}
              />
            </FieldShell>

            <FieldShell error={errors.description} label="Описание">
              <textarea
                className="text-area"
                name="description"
                onChange={(event) => updateField("description", event.target.value)}
                placeholder="Что это за продукт, кому он нужен и в чем его идея."
                rows={6}
                value={form.description}
              />
            </FieldShell>

            <FieldShell error={errors.stack} label="Стек">
              <input
                className="text-input"
                name="stack"
                onChange={(event) => updateField("stack", event.target.value)}
                placeholder="React, TypeScript, Go"
                type="text"
                value={form.stack}
              />
            </FieldShell>

            <FieldShell error={errors.roles} label="Роли для найма">
              <textarea
                className="text-area"
                name="roles"
                onChange={(event) => updateField("roles", event.target.value)}
                placeholder="Frontend-разработчик, QA, UI-дизайнер"
                rows={4}
                value={form.roles}
              />
            </FieldShell>

            <div className="button-row">
              <button className="primary-button primary-button--compact" disabled={pending} type="submit">
                {pending ? "Сохраняем…" : isEditMode ? "Сохранить изменения" : "Создать проект"}
              </button>
              <Link className="ghost-button" to="/home">
                Отмена
              </Link>
            </div>
          </form>
        )}
      </section>
    </AppShell>
  );
}
