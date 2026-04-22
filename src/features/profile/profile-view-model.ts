import type { Profile, User } from "../../shared/types.ts";

export function getHomePagePlaceholder(): string {
  return "Здесь будет лента проектов / подбор команд, а пока вы можете оформить профиль и опубликовать свой первый проект.";
}

export function getProfilePageData(user: Pick<User, "name" | "email">): {
  name: string;
  email: string;
  note: string;
} {
  return {
    name: user.name,
    email: user.email,
    note: "Описание и навыки можно редактировать прямо в профиле",
  };
}

export function getEmptySkillsMessage(profile: Profile): string {
  return profile.skills.length === 0
    ? "Добавьте навыки, чтобы проекты и участники могли точнее находить вас."
    : "Список навыков обновляется сразу после действия.";
}
