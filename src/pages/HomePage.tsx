import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { AppShell } from "../app/AppShell.tsx";
import { useAuth } from "../app/providers/AuthProvider.tsx";
import { getHomePagePlaceholder } from "../features/profile/profile-view-model.ts";
import { getWorkspaceSummary } from "../features/profile/workspace-summary.ts";
import { apiClient } from "../shared/api/index.ts";
import { ApiClientError } from "../shared/api/contracts.ts";
import { EmptyState } from "../shared/components/EmptyState.tsx";
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
      title="Рабочая зона проекта"
      description="Здесь собираются ваши проекты, короткие статусы профиля и быстрые действия для Sprint 2–3 сценариев."
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
            <p className="sidebar-card__eyebrow">Следующий шаг</p>
            <h3>Заполните профиль полностью</h3>
            <p>Описание, навыки и первый проект делают ваш аккаунт пригодным для поиска и мэтчинга.</p>
            <Link className="ghost-button" to="/profile">
              Перейти в профиль
            </Link>
          </article>
        </div>
      }
    >
      <div className="content-stack">
        {flash ? <StatusBanner message={flash.message} title={flash.title} tone={flash.tone ?? "info"} /> : null}
        {error ? <StatusBanner message={error} title="Проблема при загрузке" tone="error" /> : null}

        <section className="hero-card">
          <p className="hero-card__eyebrow">Product placeholder</p>
          <h2>Здесь начнется лента релевантных команд и проектов</h2>
          <p>{getHomePagePlaceholder()}</p>
        </section>

        <section aria-label="Сводка рабочей зоны" className="overview-grid">
          {summary.cards.map((card) => (
            <article className="overview-card" key={card.title}>
              <p className="overview-card__title">{card.title}</p>
              <p className="overview-card__caption">{card.caption}</p>
            </article>
          ))}
        </section>

        <section className="panel">
          <div className="panel__header">
            <div>
              <p className="panel__eyebrow">Projects CRUD</p>
              <h2>Ваши проекты</h2>
            </div>
            <Link className="ghost-button" to="/projects/new">
              Новый проект
            </Link>
          </div>

          {loading ? (
            <LoadingBlock label="Собираем проекты и статистику профиля…" />
          ) : projects.length === 0 ? (
            <EmptyState
              action={
                <Link className="primary-button primary-button--compact" to="/projects/new">
                  Создать первый проект
                </Link>
              }
              description="Сформулируйте идею, стек и роли — после этого список на главной будет заполняться автоматически."
              title="У вас пока нет проектов"
            />
          ) : (
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
          )}
        </section>
      </div>
    </AppShell>
  );
}
