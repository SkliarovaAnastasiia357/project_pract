import { createBrowserRouter, Navigate } from "react-router-dom";

import { LoadingBlock } from "../shared/components/LoadingBlock.tsx";
import { BrandMark } from "../shared/components/BrandMark.tsx";
import { HomePage } from "../pages/HomePage.tsx";
import { LoginPage } from "../pages/LoginPage.tsx";
import { ProfilePage } from "../pages/ProfilePage.tsx";
import { ProjectEditorPage } from "../pages/ProjectEditorPage.tsx";
import { RegisterPage } from "../pages/RegisterPage.tsx";
import { ProtectedRoute } from "./ProtectedRoute.tsx";
import { useAuth } from "./providers/AuthProvider.tsx";

function RootRedirect() {
  const { status } = useAuth();

  if (status === "booting") {
    return (
      <main className="centered-state">
        <LoadingBlock label="Готовим рабочую зону…" />
      </main>
    );
  }

  return <Navigate replace to={status === "authenticated" ? "/home" : "/login"} />;
}

function NotFoundPage() {
  return (
    <main className="centered-state">
      <div className="not-found-card">
        <BrandMark caption="route not found" />
        <h1>Страница не найдена</h1>
        <p>Проверьте адрес или вернитесь в рабочую зону через навигацию приложения.</p>
      </div>
    </main>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootRedirect />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/register",
    element: <RegisterPage />,
  },
  {
    path: "/home",
    element: (
      <ProtectedRoute>
        <HomePage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/profile",
    element: (
      <ProtectedRoute>
        <ProfilePage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/projects/new",
    element: (
      <ProtectedRoute>
        <ProjectEditorPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/projects/:id/edit",
    element: (
      <ProtectedRoute>
        <ProjectEditorPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);
