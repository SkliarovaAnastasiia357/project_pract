import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { AppShell } from "../app/AppShell.tsx";
import { useAuth } from "../app/providers/AuthProvider.tsx";
import {
  filterCandidateMatches,
  rankCandidatesForProject,
} from "../features/matching/candidate-match.ts";
import { apiClient } from "../shared/api/index.ts";
import { ApiClientError } from "../shared/api/contracts.ts";
import { EmptyState } from "../shared/components/EmptyState.tsx";
import { FieldShell } from "../shared/components/FieldShell.tsx";
import { LoadingBlock } from "../shared/components/LoadingBlock.tsx";
import { StatusBanner } from "../shared/components/StatusBanner.tsx";
import type { Project, UserSearchResult } from "../shared/types.ts";

export function CandidateMatchingPage() {
  const { id: projectId } = useParams();
  const { session } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [candidates, setCandidates] = useState<UserSearchResult[]>([]);
  const [query, setQuery] = useState("");
  const [onlyMatched, setOnlyMatched] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadCandidates() {
      if (!session || !projectId) {
        return;
      }

      setLoading(true);
      setError("");

      try {
        const [nextProject, nextCandidates] = await Promise.all([
          apiClient.getProject(session.token, projectId),
          apiClient.searchUsers(session.token, { query: "" }),
        ]);

        if (!cancelled) {
          setProject(nextProject);
          setCandidates(nextCandidates);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof ApiClientError ? loadError.message : "Не удалось подобрать кандидатов.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadCandidates();

    return () => {
      cancelled = true;
    };
  }, [projectId, session]);

  const rankedCandidates = project ? rankCandidatesForProject(project, candidates) : [];
  const visibleCandidates = filterCandidateMatches(rankedCandidates, query, onlyMatched);
  const matchedCount = rankedCandidates.filter((entry) => entry.match.score > 0).length;

  function resetFilters() {
    setQuery("");
    setOnlyMatched(false);
  }

  return (
    <AppShell
      title="Подбор команды"
      description="Сравните требования проекта с профилями участников и сразу увидьте, почему кандидат оказался выше в списке."
      actions={
        <Link className="primary-button primary-button--compact" to="/home">
          Вернуться к проектам
        </Link>
      }
      aside={
        project ? (
          <div className="sidebar-stack">
            <article className="sidebar-card sidebar-card--accent">
              <p className="sidebar-card__eyebrow">Выбранный проект</p>
              <h3>{project.title}</h3>
              <p>{project.description}</p>
            </article>
            <article className="sidebar-card">
              <p className="sidebar-card__eyebrow">Требования</p>
              <dl className="metric-list">
                <div>
                  <dt>Стек · вес 60%</dt>
                  <dd>{project.stack || "Не указан"}</dd>
                </div>
                <div>
                  <dt>Роли · вес 40%</dt>
                  <dd>{project.roles || "Не указаны"}</dd>
                </div>
              </dl>
            </article>
            <article className="sidebar-card">
              <p className="sidebar-card__eyebrow">Сводка</p>
              <dl className="metric-list">
                <div>
                  <dt>Доступно профилей</dt>
                  <dd>{rankedCandidates.length}</dd>
                </div>
                <div>
                  <dt>Есть совпадения</dt>
                  <dd>{matchedCount}</dd>
                </div>
              </dl>
            </article>
          </div>
        ) : undefined
      }
    >
      <div className="content-stack">
        {error ? <StatusBanner message={error} title="Подбор временно недоступен" tone="error" /> : null}

        {loading ? (
          <LoadingBlock label="Сравниваем требования проекта с профилями…" />
        ) : project ? (
          <>
            <section className="panel candidate-toolbar">
              <FieldShell hint="Имя, описание профиля или навык" label="Поиск среди кандидатов">
                <input
                  className="text-input"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Например: React, QA, Figma"
                  type="search"
                  value={query}
                />
              </FieldShell>
              <label className="candidate-filter">
                <input
                  checked={onlyMatched}
                  onChange={(event) => setOnlyMatched(event.target.checked)}
                  type="checkbox"
                />
                <span>Только с совпадениями</span>
              </label>
            </section>

            <section className="panel">
              <div className="panel__header">
                <div>
                  <p className="panel__eyebrow">Рейтинг профилей</p>
                  <h2>Кандидаты для «{project.title}»</h2>
                </div>
                <span className="match-pill">Показано {visibleCandidates.length}</span>
              </div>

              {candidates.length === 0 ? (
                <EmptyState
                  action={
                    <Link className="primary-button primary-button--compact" to="/home">
                      Вернуться к проектам
                    </Link>
                  }
                  description="После появления других профилей здесь будет рассчитано их соответствие проекту."
                  title="Пока некого сравнивать"
                />
              ) : visibleCandidates.length === 0 ? (
                <EmptyState
                  action={
                    <button className="ghost-button ghost-button--compact" onClick={resetFilters} type="button">
                      Сбросить фильтры
                    </button>
                  }
                  description="Измените поисковый запрос или покажите профили без совпадений."
                  title="Кандидаты по фильтру не найдены"
                />
              ) : (
                <div className="candidate-list">
                  {visibleCandidates.map(({ candidate, match }, index) => (
                    <article className="project-card candidate-card" key={candidate.id}>
                      <div className="candidate-card__rank" aria-label={`Место в рейтинге: ${index + 1}`}>
                        {index + 1}
                      </div>
                      <div className="candidate-card__body">
                        <div className="project-card__header">
                          <div>
                            <p className="project-card__eyebrow">{candidate.email}</p>
                            <h3>{candidate.name}</h3>
                          </div>
                          <div className="candidate-card__score" aria-label={`Соответствие ${match.score}%`}>
                            <strong>{match.score}%</strong>
                            <span>соответствие</span>
                          </div>
                        </div>

                        <div className="completion-meter" aria-hidden="true">
                          <div className="completion-meter__bar">
                            <div className="completion-meter__fill" style={{ width: `${match.score}%` }} />
                          </div>
                        </div>

                        <p className="candidate-card__bio">{candidate.bio || "Описание профиля пока не заполнено."}</p>

                        <ul className="candidate-card__reasons">
                          {match.reasons.map((reason) => (
                            <li key={reason}>{reason}</li>
                          ))}
                        </ul>

                        {candidate.skills.length > 0 ? (
                          <ul className="tag-list" aria-label="Навыки кандидата">
                            {candidate.skills.map((skill) => (
                              <li className="tag-list__item" key={skill.id}>
                                <span>{skill.name}</span>
                              </li>
                            ))}
                          </ul>
                        ) : null}

                        <div className="project-card__actions">
                          <a
                            className="ghost-button ghost-button--compact"
                            href={`mailto:${candidate.email}?subject=${encodeURIComponent(`Проект Teamnova: ${project.title}`)}`}
                          >
                            Связаться по email
                          </a>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
