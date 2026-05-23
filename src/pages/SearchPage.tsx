import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { AppShell } from "../app/AppShell.tsx";
import { useAuth } from "../app/providers/AuthProvider.tsx";
import { apiClient } from "../shared/api/index.ts";
import { ApiClientError } from "../shared/api/contracts.ts";
import { EmptyState } from "../shared/components/EmptyState.tsx";
import { FieldShell } from "../shared/components/FieldShell.tsx";
import { LoadingBlock } from "../shared/components/LoadingBlock.tsx";
import { StatusBanner } from "../shared/components/StatusBanner.tsx";
import type { ApplicationStatus, ProjectSearchResult, UserSearchResult } from "../shared/types.ts";

const applicationLabels: Record<ApplicationStatus, string> = {
  pending: "Заявка на рассмотрении",
  accepted: "Заявка принята",
  rejected: "Заявка отклонена",
};

export function SearchPage() {
  const { session } = useAuth();
  const [query, setQuery] = useState("");
  const [projectResults, setProjectResults] = useState<ProjectSearchResult[]>([]);
  const [userResults, setUserResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ tone: "success" | "error" | "info"; message: string } | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  async function runSearch(nextQuery = query) {
    if (!session) {
      return;
    }

    setLoading(true);
    setNotice(null);

    try {
      const [projects, users] = await Promise.all([
        apiClient.searchProjects(session.token, { query: nextQuery }),
        apiClient.searchUsers(session.token, { query: nextQuery }),
      ]);
      setProjectResults(projects);
      setUserResults(users);
    } catch (error) {
      setNotice({
        tone: "error",
        message: error instanceof ApiClientError ? error.message : "Не удалось выполнить поиск.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void runSearch("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runSearch(query);
  }

  async function handleApply(project: ProjectSearchResult) {
    if (!session) {
      return;
    }

    setApplyingId(project.id);
    setNotice(null);

    try {
      const application = await apiClient.applyToProject(session.token, project.id, {
        message: `Хочу присоединиться к проекту "${project.title}".`,
      });
      setProjectResults((current) =>
        current.map((entry) =>
          entry.id === project.id ? { ...entry, applicationStatus: application.status } : entry,
        ),
      );
      setNotice({ tone: "success", message: "Заявка отправлена владельцу проекта." });
    } catch (error) {
      setNotice({
        tone: "error",
        message: error instanceof ApiClientError ? error.message : "Не удалось отправить заявку.",
      });
    } finally {
      setApplyingId(null);
    }
  }

  return (
    <AppShell
      title="Поиск команд и участников"
      description="Ищите проекты по тегам стека и ключевым словам, а участников — по навыкам и описанию профиля."
      actions={
        <Link className="primary-button primary-button--compact" to="/requests">
          Входящие заявки
        </Link>
      }
      aside={
        <div className="sidebar-stack">
          <article className="sidebar-card">
            <p className="sidebar-card__eyebrow">Результаты</p>
            <dl className="metric-list">
              <div>
                <dt>Проектов</dt>
                <dd>{projectResults.length}</dd>
              </div>
              <div>
                <dt>Участников</dt>
                <dd>{userResults.length}</dd>
              </div>
            </dl>
          </article>
          <article className="sidebar-card sidebar-card--accent">
            <p className="sidebar-card__eyebrow">Сценарий защиты</p>
            <h3>Полный MVP-цикл</h3>
            <p>Создатель публикует проект, участник находит его через поиск и отправляет заявку.</p>
          </article>
        </div>
      }
    >
      <div className="content-stack">
        {notice ? <StatusBanner message={notice.message} tone={notice.tone} /> : null}

        <section className="panel">
          <form className="inline-form" onSubmit={handleSubmit}>
            <FieldShell hint="Например: React, TypeScript, QA, Figma" label="Поисковый запрос">
              <input
                className="text-input"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Навык, тег или ключевое слово"
                type="search"
                value={query}
              />
            </FieldShell>
            <button className="primary-button primary-button--compact" disabled={loading} type="submit">
              {loading ? "Ищем…" : "Найти"}
            </button>
          </form>
        </section>

        {loading ? (
          <LoadingBlock label="Ищем проекты и участников…" />
        ) : (
          <>
            <section className="panel">
              <div className="panel__header">
                <div>
                  <p className="panel__eyebrow">Поиск проектов</p>
                  <h2>Проекты</h2>
                </div>
              </div>

              {projectResults.length === 0 ? (
                <EmptyState description="Попробуйте другой стек или ключевое слово." title="Проекты не найдены" />
              ) : (
                <div className="project-grid">
                  {projectResults.map((project) => {
                    const isOwnProject = project.ownerId === session?.user.id;
                    return (
                      <article className="project-card" key={project.id}>
                        <div className="project-card__header">
                          <div>
                            <p className="project-card__eyebrow">Владелец: {project.ownerName}</p>
                            <h3>{project.title}</h3>
                          </div>
                          {project.applicationStatus ? (
                            <span className={`status-pill status-pill--${project.applicationStatus}`}>
                              {applicationLabels[project.applicationStatus]}
                            </span>
                          ) : null}
                        </div>
                        <p className="project-card__description">{project.description}</p>
                        <dl className="project-card__meta">
                          <div>
                            <dt>Теги / стек</dt>
                            <dd>{project.stack || "Не указан"}</dd>
                          </div>
                          <div>
                            <dt>Роли</dt>
                            <dd>{project.roles || "Не указаны"}</dd>
                          </div>
                        </dl>
                        <div className="project-card__actions">
                          {isOwnProject ? (
                            <Link className="ghost-button ghost-button--compact" to={`/projects/${project.id}/edit`}>
                              Редактировать
                            </Link>
                          ) : (
                            <button
                              className="primary-button primary-button--compact"
                              disabled={Boolean(project.applicationStatus) || applyingId === project.id}
                              onClick={() => void handleApply(project)}
                              type="button"
                            >
                              {applyingId === project.id ? "Отправляем…" : "Откликнуться"}
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="panel">
              <div className="panel__header">
                <div>
                  <p className="panel__eyebrow">Поиск участников</p>
                  <h2>Участники</h2>
                </div>
              </div>

              {userResults.length === 0 ? (
                <EmptyState description="Запрос пока не совпал с навыками или описанием профилей." title="Участники не найдены" />
              ) : (
                <div className="project-grid">
                  {userResults.map((user) => (
                    <article className="project-card" key={user.id}>
                      <div>
                        <p className="project-card__eyebrow">{user.email}</p>
                        <h3>{user.name}</h3>
                      </div>
                      <p className="project-card__description">{user.bio || "Описание пока не заполнено."}</p>
                      {user.skills.length > 0 ? (
                        <ul className="tag-list">
                          {user.skills.map((skill) => (
                            <li className="tag-list__item" key={skill.id}>
                              <span>{skill.name}</span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
