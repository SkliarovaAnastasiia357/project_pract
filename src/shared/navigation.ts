import type { NavigationItem } from "./types.ts";

export function buildNavigationMenu(currentPath: string): NavigationItem[] {
  const items = [
    { label: "Главная", path: "/home", kind: "link" as const },
    { label: "Мой профиль", path: "/profile", kind: "link" as const },
    { label: "Новый проект", path: "/projects/new", kind: "link" as const },
    { label: "Выйти", path: "/logout", kind: "action" as const },
  ];

  return items.map((item) => ({
    ...item,
    active: item.kind === "link" ? currentPath === item.path : false,
  }));
}
