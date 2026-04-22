import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { BrandMark } from "./BrandMark.tsx";

type AuthSplitLayoutProps = {
  title: string;
  description: string;
  eyebrow: string;
  helperLabel: string;
  helperPath: string;
  helperText: string;
  children: ReactNode;
};

const featureList = [
  "Регистрация и вход с валидацией и понятными состояниями ошибок.",
  "Профиль с описанием, навыками и быстрым обновлением без перезагрузки.",
  "Рабочая зона для создания, редактирования и удаления проектов.",
];

export function AuthSplitLayout({
  title,
  description,
  eyebrow,
  helperLabel,
  helperPath,
  helperText,
  children,
}: AuthSplitLayoutProps) {
  return (
    <main className="auth-shell">
      <section className="auth-shell__story">
        <BrandMark caption="workspace for builders" />
        <div className="auth-shell__copy">
          <p className="auth-shell__eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="auth-shell__description">{description}</p>
        </div>

        <div className="auth-shell__feature-grid">
          {featureList.map((item) => (
            <article className="auth-shell__feature-card" key={item}>
              <span className="auth-shell__feature-index" aria-hidden="true" />
              <p>{item}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="auth-shell__surface">
        <div className="auth-shell__surface-card">{children}</div>
        <p className="auth-shell__helper">
          {helperText} <Link to={helperPath}>{helperLabel}</Link>
        </p>
      </section>
    </main>
  );
}
