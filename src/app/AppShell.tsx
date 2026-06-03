import type { ReactNode, UIEvent } from "react";
import { useLayoutEffect, useRef } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";

import { buildNavigationMenu } from "../shared/navigation.ts";
import { BrandMark } from "../shared/components/BrandMark.tsx";
import { useAuth } from "./providers/AuthProvider.tsx";

type AppShellProps = {
  title: string;
  description: string;
  actions?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
};

const navigationScrollStorageKey = "teamnova.navigation-scroll-left";

export function AppShell({ title, description, actions, aside, children }: AppShellProps) {
  const location = useLocation();
  const navigationRef = useRef<HTMLElement | null>(null);
  const { logout, session } = useAuth();
  const navigation = buildNavigationMenu(location.pathname);
  const isProfilePage = location.pathname === "/profile";

  useLayoutEffect(() => {
    const navigationElement = navigationRef.current;

    if (!navigationElement) {
      return;
    }

    const storedScrollLeft = window.sessionStorage.getItem(navigationScrollStorageKey);
    if (storedScrollLeft) {
      navigationElement.scrollLeft = Number(storedScrollLeft);
    }
  }, [location.pathname]);

  async function handleLogout() {
    await logout();
  }

  function handleNavigationScroll(event: UIEvent<HTMLElement>) {
    window.sessionStorage.setItem(navigationScrollStorageKey, String(event.currentTarget.scrollLeft));
  }

  return (
    <div className="workspace-shell">
      <aside className="workspace-shell__sidebar">
        <BrandMark caption="проектная платформа" />

        <nav
          className="workspace-shell__nav"
          aria-label="Основная навигация"
          onScroll={handleNavigationScroll}
          ref={navigationRef}
        >
          {navigation.map((item) =>
            item.kind === "action" ? (
              <button className="workspace-shell__nav-button" key={item.label} onClick={handleLogout} type="button">
                <span className="workspace-shell__nav-icon" aria-hidden="true" />
                {item.label}
              </button>
            ) : (
              <NavLink
                className={({ isActive }) =>
                  `workspace-shell__nav-link ${isActive || item.active ? "workspace-shell__nav-link--active" : ""}`
                }
                key={item.path}
                to={item.path}
              >
                <span className="workspace-shell__nav-icon" aria-hidden="true" />
                {item.label}
              </NavLink>
            ),
          )}
        </nav>

        <div className="workspace-shell__meta">
          <p className="workspace-shell__meta-label">Активный аккаунт</p>
          <strong>{session?.user.name}</strong>
          <span className="workspace-shell__meta-email">{session?.user.email}</span>
        </div>
      </aside>

      <main className="workspace-shell__content">
        <section className="workspace-shell__intro">
          <p className="workspace-shell__eyebrow">Рабочая область команды</p>
          <h1>{title}</h1>
          <p className="workspace-shell__description">{description}</p>

          <div className="workspace-shell__actions">
            {actions}
            {!isProfilePage ? (
              <Link className="ghost-button" to="/profile">
                Открыть профиль
              </Link>
            ) : null}
          </div>
        </section>

        <section className="workspace-shell__main">{children}</section>
        {aside ? <aside className="workspace-shell__aside">{aside}</aside> : null}
      </main>
    </div>
  );
}
