import type { ReactNode } from "react";
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

export function AppShell({ title, description, actions, aside, children }: AppShellProps) {
  const location = useLocation();
  const { logout, session } = useAuth();
  const navigation = buildNavigationMenu(location.pathname);

  async function handleLogout() {
    await logout();
  }

  return (
    <div className="workspace-shell">
      <header className="workspace-shell__header">
        <BrandMark caption="app workspace" />

        <nav className="workspace-shell__nav" aria-label="Основная навигация">
          {navigation.map((item) =>
            item.kind === "action" ? (
              <button className="workspace-shell__nav-button" key={item.label} onClick={handleLogout} type="button">
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
      </header>

      <main className="workspace-shell__content">
        <section className="workspace-shell__intro">
          <p className="workspace-shell__eyebrow">Teamnova workspace</p>
          <h1>{title}</h1>
          <p className="workspace-shell__description">{description}</p>

          <div className="workspace-shell__actions">
            {actions}
            <Link className="ghost-button" to="/profile">
              Открыть профиль
            </Link>
          </div>
        </section>

        <section className="workspace-shell__main">{children}</section>
        {aside ? <aside className="workspace-shell__aside">{aside}</aside> : null}
      </main>
    </div>
  );
}
