import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { AppShell } from "../app/AppShell.tsx";
import { useAuth } from "../app/providers/AuthProvider.tsx";
import { apiClient } from "../shared/api/index.ts";
import { ApiClientError } from "../shared/api/contracts.ts";
import { EmptyState } from "../shared/components/EmptyState.tsx";
import { LoadingBlock } from "../shared/components/LoadingBlock.tsx";
import { StatusBanner } from "../shared/components/StatusBanner.tsx";
import type { ApplicationStatus, IncomingApplication } from "../shared/types.ts";

const statusLabels: Record<ApplicationStatus, string> = {
  pending: "На рассмотрении",
  accepted: "Принята",
  rejected: "Отклонена",
};

export function RequestsPage() {
  const { session } = useAuth();
  const [applications, setApplications] = useState<IncomingApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [decidingId, setDecidingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadApplications() {
      if (!session) {
        return;
      }

      setLoading(true);
      setNotice(null);

      try {
        const nextApplications = await apiClient.listIncomingApplications(session.token);

        if (!cancelled) {
          setApplications(nextApplications);
        }
      } catch (error) {
        if (!cancelled) {
          setNotice({
            tone: "error",
            message: error instanceof ApiClientError ? error.message : "Не удалось загрузить заявки.",
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadApplications();

    return () => {
      cancelled = true;
    };
  }, [session]);

  async function handleDecision(applicationId: string, status: Extract<ApplicationStatus, "accepted" | "rejected">) {
    if (!session) {
      return;
    }

    setDecidingId(applicationId);
    setNotice(null);

    try {
      const decision = await apiClient.decideApplication(session.token, applicationId, { status });
      setApplications((current) =>
        current.map((application) =>
          application.id === applicationId ? { ...application, status: decision.status, updatedAt: decision.updatedAt } : application,
        ),
      );
      setNotice({ tone: "success", message: status === "accepted" ? "Заявка принята." : "Заявка отклонена." });
    } catch (error) {
      setNotice({
        tone: "error",
        message: error instanceof ApiClientError ? error.message : "Не удалось изменить заявку.",
      });
    } finally {
      setDecidingId(null);
    }
  }

  return (
    <AppShell
      title="Входящие заявки"
      description="Владелец проекта просматривает отклики участников и принимает решение по каждому кандидату."
      actions={
        <Link className="primary-button primary-button--compact" to="/search">
          Открыть поиск
        </Link>
      }
      aside={
        <div className="sidebar-stack">
          <article className="sidebar-card">
            <p className="sidebar-card__eyebrow">Статусы</p>
            <dl className="metric-list">
              <div>
                <dt>Ожидают решения</dt>
                <dd>{applications.filter((application) => application.status === "pending").length}</dd>
              </div>
              <div>
                <dt>Всего заявок</dt>
                <dd>{applications.length}</dd>
              </div>
            </dl>
          </article>
        </div>
      }
    >
      <div className="content-stack">
        {notice ? <StatusBanner message={notice.message} tone={notice.tone} /> : null}

        <section className="panel">
          <div className="panel__header">
            <div>
              <p className="panel__eyebrow">Заявки</p>
              <h2>Кандидаты в ваши проекты</h2>
            </div>
          </div>

          {loading ? (
            <LoadingBlock label="Загружаем входящие заявки…" />
          ) : applications.length === 0 ? (
            <EmptyState
              action={
                <Link className="primary-button primary-button--compact" to="/search">
                  Посмотреть поиск
                </Link>
              }
              description="Когда участники откликнутся на ваши проекты, заявки появятся здесь."
              title="Входящих заявок пока нет"
            />
          ) : (
            <div className="project-grid">
              {applications.map((application) => (
                <article className="project-card" key={application.id}>
                  <div className="project-card__header">
                    <div>
                      <p className="project-card__eyebrow">{application.project.title}</p>
                      <h3>{application.applicant.name}</h3>
                    </div>
                    <span className={`status-pill status-pill--${application.status}`}>{statusLabels[application.status]}</span>
                  </div>

                  <p className="project-card__description">{application.applicant.bio || "Описание профиля не заполнено."}</p>
                  {application.message ? <p className="project-card__description">Сообщение: {application.message}</p> : null}

                  {application.applicant.skills.length > 0 ? (
                    <ul className="tag-list">
                      {application.applicant.skills.map((skill) => (
                        <li className="tag-list__item" key={skill.id}>
                          <span>{skill.name}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  <div className="project-card__actions">
                    <button
                      className="primary-button primary-button--compact"
                      disabled={decidingId === application.id || application.status === "accepted"}
                      onClick={() => void handleDecision(application.id, "accepted")}
                      type="button"
                    >
                      Принять
                    </button>
                    <button
                      className="ghost-button ghost-button--compact ghost-button--danger"
                      disabled={decidingId === application.id || application.status === "rejected"}
                      onClick={() => void handleDecision(application.id, "rejected")}
                      type="button"
                    >
                      Отклонить
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
