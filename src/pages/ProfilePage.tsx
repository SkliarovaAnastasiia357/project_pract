import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { AppShell } from "../app/AppShell.tsx";
import { useAuth } from "../app/providers/AuthProvider.tsx";
import { getEmptySkillsMessage } from "../features/profile/profile-view-model.ts";
import { getWorkspaceSummary } from "../features/profile/workspace-summary.ts";
import { apiClient } from "../shared/api/index.ts";
import { ApiClientError } from "../shared/api/contracts.ts";
import { EmptyState } from "../shared/components/EmptyState.tsx";
import { FieldShell } from "../shared/components/FieldShell.tsx";
import { LoadingBlock } from "../shared/components/LoadingBlock.tsx";
import { StatusBanner } from "../shared/components/StatusBanner.tsx";
import type { Profile, Project } from "../shared/types.ts";

export function ProfilePage() {
  const { mergeCurrentUser, session } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [bioDraft, setBioDraft] = useState("");
  const [skillDraft, setSkillDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [bioError, setBioError] = useState("");
  const [skillError, setSkillError] = useState("");
  const [savingBio, setSavingBio] = useState(false);
  const [savingSkill, setSavingSkill] = useState(false);
  const [removingSkillId, setRemovingSkillId] = useState<string | null>(null);
  const summary = getWorkspaceSummary({
    hasBio: Boolean(profile?.bio.trim()),
    skillsCount: profile?.skills.length ?? 0,
    projectsCount: projects.length,
  });

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      if (!session) {
        return;
      }

      setLoading(true);
      setNotice(null);

      try {
        const [nextProfile, nextProjects] = await Promise.all([
          apiClient.getProfile(session.token),
          apiClient.listProjects(session.token),
        ]);

        if (cancelled) {
          return;
        }

        setProfile(nextProfile);
        setProjects(nextProjects);
        setBioDraft(nextProfile.bio);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setNotice({
          tone: "error",
          message: error instanceof ApiClientError ? error.message : "Не удалось загрузить профиль.",
        });
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [session]);

  async function handleBioSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session) {
      return;
    }

    setSavingBio(true);
    setBioError("");
    setNotice(null);

    try {
      const nextProfile = await apiClient.updateProfile(session.token, { bio: bioDraft });
      setProfile(nextProfile);
      mergeCurrentUser({ bio: nextProfile.bio });
      setNotice({ tone: "success", message: "Описание профиля обновлено." });
    } catch (error) {
      if (error instanceof ApiClientError) {
        setBioError(error.fieldErrors?.bio ?? "");
        setNotice({ tone: "error", message: error.message });
      } else {
        setNotice({ tone: "error", message: "Не удалось сохранить описание профиля." });
      }
    } finally {
      setSavingBio(false);
    }
  }

  async function handleSkillSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session) {
      return;
    }

    setSavingSkill(true);
    setSkillError("");
    setNotice(null);

    try {
      const nextProfile = await apiClient.addSkill(session.token, { name: skillDraft });
      setProfile(nextProfile);
      setSkillDraft("");
      setNotice({ tone: "success", message: "Навык добавлен." });
    } catch (error) {
      if (error instanceof ApiClientError) {
        setSkillError(error.fieldErrors?.name ?? "");
        setNotice({ tone: "error", message: error.message });
      } else {
        setNotice({ tone: "error", message: "Не удалось добавить навык." });
      }
    } finally {
      setSavingSkill(false);
    }
  }

  async function handleDeleteSkill(skillId: string) {
    if (!session) {
      return;
    }

    setRemovingSkillId(skillId);
    setNotice(null);

    try {
      const nextProfile = await apiClient.deleteSkill(session.token, skillId);
      setProfile(nextProfile);
      setNotice({ tone: "success", message: "Навык удален." });
    } catch (error) {
      setNotice({
        tone: "error",
        message: error instanceof ApiClientError ? error.message : "Не удалось удалить навык.",
      });
    } finally {
      setRemovingSkillId(null);
    }
  }

  return (
    <AppShell
      title="Профиль участника"
      description="Редактируйте описание и навыки без перезагрузки. Эти данные будут использованы в поиске и мэтчинге."
      actions={
        <Link className="primary-button primary-button--compact" to="/projects/new">
          Создать проект
        </Link>
      }
      aside={
        <div className="sidebar-stack">
          <article className="sidebar-card">
            <p className="sidebar-card__eyebrow">Контактные данные</p>
            <h3>{session?.user.name}</h3>
            <p>{session?.user.email}</p>
            <p>{session?.user.bio || "Описание пока не заполнено."}</p>
            <div className="completion-meter" aria-label="Прогресс заполнения профиля">
              <div className="completion-meter__bar">
                <div className="completion-meter__fill" style={{ width: `${summary.completionRatio}%` }} />
              </div>
              <p className="completion-meter__label">
                {summary.completionRatio}% · {summary.completionLabel}
              </p>
            </div>
          </article>

          <article className="sidebar-card">
            <p className="sidebar-card__eyebrow">Проекты</p>
            <h3>{projects.length}</h3>
            <p>Проектов в рабочей зоне. На главной странице они доступны для быстрого редактирования.</p>
          </article>
        </div>
      }
    >
      <div className="content-stack">
        {notice ? <StatusBanner message={notice.message} tone={notice.tone} /> : null}

        {loading ? (
          <LoadingBlock label="Загружаем описание, навыки и проекты…" />
        ) : (
          <>
            <section aria-label="Сводка профиля" className="overview-grid">
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
                  <p className="panel__eyebrow">Описание профиля</p>
                  <h2>Описание</h2>
                </div>
              </div>

              <form className="content-stack" onSubmit={handleBioSubmit}>
                <FieldShell error={bioError} hint="Пустое описание допустимо, но заполненный профиль работает лучше." label="О себе">
                  <textarea
                    className="text-area"
                    name="bio"
                    onChange={(event) => setBioDraft(event.target.value)}
                    placeholder="Расскажите, в каком стеке и формате вы хотите работать."
                    rows={5}
                    value={bioDraft}
                  />
                </FieldShell>

                <button className="primary-button primary-button--compact" disabled={savingBio} type="submit">
                  {savingBio ? "Сохраняем…" : "Сохранить описание"}
                </button>
              </form>
            </section>

            <section className="panel">
              <div className="panel__header">
                <div>
                  <p className="panel__eyebrow">Навыки</p>
                  <h2>Навыки</h2>
                </div>
              </div>

              <form className="inline-form" onSubmit={handleSkillSubmit}>
                <FieldShell error={skillError} hint={profile ? getEmptySkillsMessage(profile) : ""} label="Новый навык">
                  <input
                    className="text-input"
                    name="skill"
                    onChange={(event) => setSkillDraft(event.target.value)}
                    placeholder="Например: React, Go, Figma"
                    type="text"
                    value={skillDraft}
                  />
                </FieldShell>

                <button className="primary-button primary-button--compact" disabled={savingSkill} type="submit">
                  {savingSkill ? "Добавляем…" : "Добавить"}
                </button>
              </form>

              {profile && profile.skills.length > 0 ? (
                <ul className="tag-list">
                  {profile.skills.map((skill) => (
                    <li className="tag-list__item" key={skill.id}>
                      <span>{skill.name}</span>
                      <button
                        aria-label={`Удалить навык ${skill.name}`}
                        className="tag-list__remove"
                        disabled={removingSkillId === skill.id}
                        onClick={() => void handleDeleteSkill(skill.id)}
                        type="button"
                      >
                        {removingSkillId === skill.id ? "…" : "×"}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  description="Добавьте первый навык через поле выше. Список обновится сразу, без перезагрузки страницы."
                  title="Навыки пока не добавлены"
                />
              )}
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
