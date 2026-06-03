import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { AppShell } from "../app/AppShell.tsx";
import { useAuth } from "../app/providers/AuthProvider.tsx";
import { getWorkspaceSummary } from "../features/profile/workspace-summary.ts";
import { apiClient } from "../shared/api/index.ts";
import { ApiClientError } from "../shared/api/contracts.ts";
import { EmptyState } from "../shared/components/EmptyState.tsx";
import { LoadingBlock } from "../shared/components/LoadingBlock.tsx";
import { StatusBanner } from "../shared/components/StatusBanner.tsx";
import type { DashboardMetrics, IncomingApplication, Profile, Project } from "../shared/types.ts";

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
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [incomingApplications, setIncomingApplications] = useState<IncomingApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<{ tone: "success" | "error" | "info"; message: string; title?: string } | null>(null);
  const [demoAction, setDemoAction] = useState<"seed" | "cleanup" | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const flash = (location.state as LocationFlash | null)?.flash;
  const summary = getWorkspaceSummary({
    hasBio: Boolean(profile?.bio.trim()),
    skillsCount: profile?.skills.length ?? 0,
    projectsCount: projects.length,
  });
  const acceptedTeamByProject = incomingApplications
    .filter((application) => application.status === "accepted")
    .reduce<Map<string, IncomingApplication[]>>((groups, application) => {
      const current = groups.get(application.project.id) ?? [];
      current.push(application);
      groups.set(application.project.id, current);
      return groups;
    }, new Map());

  async function loadWorkspace(isCancelled: () => boolean = () => false) {
    if (!session) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [nextProjects, nextProfile, nextMetrics, nextApplications] = await Promise.all([
        apiClient.listProjects(session.token),
        apiClient.getProfile(session.token),
        apiClient.getDashboardMetrics(session.token),
        apiClient.listIncomingApplications(session.token),
      ]);

      if (isCancelled()) {
        return;
      }

      setProjects(nextProjects);
      setProfile(nextProfile);
      setMetrics(nextMetrics);
      setIncomingApplications(nextApplications);
    } catch (loadError) {
      if (isCancelled()) {
        return;
      }

      setError(loadError instanceof ApiClientError ? loadError.message : "Не удалось загрузить рабочую зону.");
    } finally {
      if (!isCancelled()) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    let cancelled = false;
    void loadWorkspace(() => cancelled);

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  async function handleSeedDemo() {
    if (!session) {
      return;
    }

    setDemoAction("seed");
    setNotice(null);
    setError("");

    try {
      const result = await apiClient.seedDemoWorkspace(session.token);
      await loadWorkspace();
      setNotice({
        tone: "success",
        title: "Демо-стенд заполнен",
        message: `Созданы ${result.projectsCreated} проект, ${result.applicantsCreated} кандидата и ${result.applicationsCreated} заявки. Автоочистка: ${new Date(result.expiresAt).toLocaleString("ru-RU")}.`,
      });
    } catch (seedError) {
      setNotice({
        tone: "error",
        title: "Не удалось заполнить демо",
        message: seedError instanceof ApiClientError ? seedError.message : "Повторите попытку позже.",
      });
    } finally {
      setDemoAction(null);
    }
  }

  async function handleCleanupDemo() {
    if (!session) {
      return;
    }

    setDemoAction("cleanup");
    setNotice(null);
    setError("");

    try {
      const result = await apiClient.cleanupDemoWorkspace(session.token);
      await loadWorkspace();
      setNotice({
        tone: "success",
        title: "Демо-данные очищены",
        message: `Удалено: проектов ${result.projectsDeleted}, кандидатов ${result.usersDeleted}, заявок ${result.applicationsDeleted}.`,
      });
    } catch (cleanupError) {
      setNotice({
        tone: "error",
        title: "Не удалось очистить демо",
        message: cleanupError instanceof ApiClientError ? cleanupError.message : "Повторите попытку позже.",
      });
    } finally {
      setDemoAction(null);
    }
  }

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
      title="Мои проекты"
      description="Управляйте опубликованными проектами, смотрите состав команды и быстро переходите к созданию новой идеи."
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
                <dd>{metrics?.profileSkillsCount ?? profile?.skills.length ?? 0}</dd>
              </div>
              <div>
                <dt>Проектов</dt>
                <dd>{metrics?.ownedProjectsCount ?? projects.length}</dd>
              </div>
              <div>
                <dt>В команде</dt>
                <dd>{metrics?.acceptedTeamMembersCount ?? 0}</dd>
              </div>
            </dl>
          </article>

          <article className="sidebar-card sidebar-card--accent">
            <p className="sidebar-card__eyebrow">Демо-данные</p>
            <h3>Быстрый стенд</h3>
            <p>Создает тестовые проекты, кандидатов и заявки для проверки поиска, откликов и состава команды.</p>
            {metrics?.demoExpiresAt ? (
              <p className="demo-expiry">Автоочистка: {new Date(metrics.demoExpiresAt).toLocaleString("ru-RU")}</p>
            ) : null}
            <div className="button-row">
              <button
                className="primary-button primary-button--compact"
                disabled={Boolean(demoAction)}
                onClick={() => void handleSeedDemo()}
                type="button"
              >
                {demoAction === "seed" ? "Готовим…" : "Заполнить демо"}
              </button>
              <button
                className="ghost-button ghost-button--compact"
                disabled={Boolean(demoAction) || !metrics?.demoExpiresAt}
                onClick={() => void handleCleanupDemo()}
                type="button"
              >
                {demoAction === "cleanup" ? "Очищаем…" : "Очистить"}
              </button>
            </div>
          </article>
        </div>
      }
    >
      <div className="content-stack">
        {flash ? <StatusBanner message={flash.message} title={flash.title} tone={flash.tone ?? "info"} /> : null}
        {notice ? <StatusBanner message={notice.message} title={notice.title} tone={notice.tone} /> : null}
        {error ? <StatusBanner message={error} title="Проблема при загрузке" tone="error" /> : null}

        <section className="panel">
          <div className="panel__header">
            <div>
              <p className="panel__eyebrow">Проекты</p>
              <h2>Список ваших проектов</h2>
            </div>
          </div>

          {loading ? (
            <LoadingBlock label="Загружаем проекты…" />
          ) : projects.length > 0 ? (
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

                  {(acceptedTeamByProject.get(project.id)?.length ?? 0) > 0 ? (
                    <div className="team-strip">
                      <p className="team-strip__title">Состав команды</p>
                      <ul className="tag-list">
                        {acceptedTeamByProject.get(project.id)!.map((application) => (
                          <li className="tag-list__item" key={application.id}>
                            <span>{application.applicant.name}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

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
          ) : (
            <EmptyState
              title="Пока нет проектов"
              description="Создайте первый проект, чтобы участники могли найти его в поиске и отправить заявку в команду."
              action={
                <Link className="primary-button primary-button--compact" to="/projects/new">
                  Создать проект
                </Link>
              }
            />
          )}
        </section>

        <section aria-label="Live dashboard" className="overview-grid overview-grid--four">
          <article className="overview-card overview-card--metric">
            <p className="overview-card__title">{metrics?.searchableProjectsCount ?? 0}</p>
            <p className="overview-card__caption">проектов в поиске</p>
          </article>
          <article className="overview-card overview-card--metric">
            <p className="overview-card__title">{metrics?.searchableUsersCount ?? 0}</p>
            <p className="overview-card__caption">участников в базе</p>
          </article>
          <article className="overview-card overview-card--metric">
            <p className="overview-card__title">{metrics?.pendingApplicationsCount ?? 0}</p>
            <p className="overview-card__caption">заявок ждут решения</p>
          </article>
          <article className="overview-card overview-card--metric">
            <p className="overview-card__title">{metrics?.acceptedTeamMembersCount ?? 0}</p>
            <p className="overview-card__caption">участников принято</p>
          </article>
        </section>
      </div>
    </AppShell>
  );
}
