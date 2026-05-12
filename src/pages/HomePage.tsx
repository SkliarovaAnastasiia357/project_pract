import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { AppShell } from "../app/AppShell.tsx";
import { useAuth } from "../app/providers/AuthProvider.tsx";
import { getWorkspaceSummary } from "../features/profile/workspace-summary.ts";
import { buildHomeTaskBoard } from "../features/projects/project-board.ts";
import { apiClient } from "../shared/api/index.ts";
import { ApiClientError } from "../shared/api/contracts.ts";
import { LoadingBlock } from "../shared/components/LoadingBlock.tsx";
import { StatusBanner } from "../shared/components/StatusBanner.tsx";
import type { Profile, Project } from "../shared/types.ts";

type LocationFlash = {
  flash?: {
    tone?: "success" | "error" | "info";
    title?: string;
    message: string;
  };
};

export function HomePage() {
  const location = useLocation();
  const { session } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const flash = (location.state as LocationFlash | null)?.flash;
  const summary = getWorkspaceSummary({
    hasBio: Boolean(profile?.bio.trim()),
    skillsCount: profile?.skills.length ?? 0,
    projectsCount: projects.length,
  });
  const boardColumns = buildHomeTaskBoard();

  useEffect(() => {
    let cancelled = false;

    async function loadWorkspace() {
      if (!session) {
        return;
      }

      setLoading(true);
      setError("");

      try {
        const [nextProjects, nextProfile] = await Promise.all([
          apiClient.listProjects(session.token),
          apiClient.getProfile(session.token),
        ]);

        if (cancelled) {
          return;
        }

        setProjects(nextProjects);
        setProfile(nextProfile);
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        setError(loadError instanceof ApiClientError ? loadError.message : "Не удалось загрузить рабочую зону.");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadWorkspace();

    return () => {
      cancelled = true;
    };
  }, [session]);

  async function handleDeleteProject(projectId: string) {
    if (!session) {
      return;
    }

    setDeletingId(projectId);
    setConfirmingDeleteId(null);
    setError("");

    try {
      await apiClient.deleteProject(session.token, projectId);
      setProjects((currentProjects) => currentProjects.filter((project) => project.id !== projectId));
    } catch (deleteError) {
      setError(deleteError instanceof ApiClientError ? deleteError.message : "Не удалось удалить проект.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <AppShell
      title="Задачи проекта"
      description="Итерация: Отладка и поиск. Даты: 01 мая 2026 — 14 мая 2026."
      actions={
        <Link className="primary-button primary-button--compact" to="/projects/new">
          Создать проект
        </Link>
      }
      aside={
        <div className="sidebar-stack">
          <article className="sidebar-card">
            <p className="sidebar-card__eyebrow">Ваш профиль</p>
            <h3>{session?.user.name}</h3>
            <p>{session?.user.email}</p>
            <div className="completion-meter" aria-label="Статус заполнения профиля">
              <div className="completion-meter__bar">
                <div className="completion-meter__fill" style={{ width: `${summary.completionRatio}%` }} />
              </div>
              <p className="completion-meter__label">
                {summary.completionRatio}% · {summary.completionLabel}
              </p>
            </div>
            <dl className="metric-list">
              <div>
                <dt>Навыков</dt>
                <dd>{profile?.skills.length ?? 0}</dd>
              </div>
              <div>
                <dt>Проектов</dt>
                <dd>{projects.length}</dd>
              </div>
            </dl>
          </article>

          <article className="sidebar-card sidebar-card--accent">
            <p className="sidebar-card__eyebrow">Показ 4</p>
            <h3>Сценарий готовится к демонстрации</h3>
            <p>Один участник оформляет профиль, второй публикует проект, третий находит карточку через поиск и отправляет заявку.</p>
            <Link className="ghost-button" to="/search">
              Проверить поиск
            </Link>
          </article>
        </div>
      }
    >
      <div className="content-stack">
        {flash ? <StatusBanner message={flash.message} title={flash.title} tone={flash.tone ?? "info"} /> : null}
        {error ? <StatusBanner message={error} title="Проблема при загрузке" tone="error" /> : null}

        <section className="panel task-board-panel">
          <div className="panel__header">
            <div>
              <p className="panel__eyebrow">Доска задач</p>
              <h2>Спринт 4: поиск и заявки</h2>
            </div>
          </div>

          {loading ? (
            <LoadingBlock label="Загружаем доску задач…" />
          ) : (
            <div className="task-board" aria-label="Доска задач проекта">
              {boardColumns.map((column) => (
                <section className={`task-column task-column--${column.accent}`} key={column.id}>
                  <h3>{column.title}</h3>
                  <div className="task-column__cards">
                    {column.tasks.map((task) => (
                      <article className="task-card" key={task.id}>
                        <div className="task-card__body">
                          <h4>{task.title}</h4>
                          <p>{task.description}</p>
                        </div>

                        <div className="task-card__footer">
                          <span className="task-card__date">{task.dateLabel}</span>
                          <span className={`task-card__avatar task-card__avatar--${task.tone}`}>{task.assignee}</span>
                        </div>

                      </article>
                    ))}
                  </div>

                </section>
              ))}
            </div>
          )}
        </section>

        <section aria-label="Сводка рабочей зоны" className="overview-grid">
          {summary.cards.map((card) => (
            <article className="overview-card" key={card.title}>
              <p className="overview-card__title">{card.title}</p>
              <p className="overview-card__caption">{card.caption}</p>
            </article>
          ))}
        </section>

        {projects.length > 0 ? (
          <section className="panel">
            <div className="panel__header">
              <div>
                <p className="panel__eyebrow">Карточки проектов</p>
                <h2>Детали проектов</h2>
              </div>
            </div>

            <div className="project-grid">
              {projects.map((project) => (
                <article className="project-card" key={project.id}>
                  <div className="project-card__header">
                    <div>
                      <p className="project-card__eyebrow">Обновлено {new Date(project.updatedAt).toLocaleDateString("ru-RU")}</p>
                      <h3>{project.title}</h3>
                    </div>
                    <div className="project-card__actions">
                      <Link className="ghost-button ghost-button--compact" to={`/projects/${project.id}/edit`}>
                        Редактировать
                      </Link>
                      <button
                        className="ghost-button ghost-button--compact ghost-button--danger"
                        disabled={deletingId === project.id}
                        onClick={() => setConfirmingDeleteId(project.id)}
                        type="button"
                      >
                        {deletingId === project.id ? "Удаляем…" : "Удалить"}
                      </button>
                    </div>
                  </div>

                  <p className="project-card__description">{project.description}</p>
                  <dl className="project-card__meta">
                    <div>
                      <dt>Стек</dt>
                      <dd>{project.stack || "Не указан"}</dd>
                    </div>
                    <div>
                      <dt>Роли</dt>
                      <dd>{project.roles || "Не указаны"}</dd>
                    </div>
                  </dl>

                  {confirmingDeleteId === project.id ? (
                    <div className="project-card__confirm">
                      <p>Удалить проект без возможности отката?</p>
                      <div className="project-card__actions">
                        <button
                          className="ghost-button ghost-button--compact ghost-button--danger"
                          disabled={deletingId === project.id}
                          onClick={() => void handleDeleteProject(project.id)}
                          type="button"
                        >
                          {deletingId === project.id ? "Удаляем…" : "Подтвердить"}
                        </button>
                        <button
                          className="ghost-button ghost-button--compact"
                          disabled={deletingId === project.id}
                          onClick={() => setConfirmingDeleteId(null)}
                          type="button"
                        >
                          Отмена
                        </button>
                      </div>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}
