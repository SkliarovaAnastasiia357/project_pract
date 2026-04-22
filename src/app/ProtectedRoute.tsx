import type { PropsWithChildren } from "react";
import { Navigate } from "react-router-dom";

import { LoadingBlock } from "../shared/components/LoadingBlock.tsx";
import { useAuth } from "./providers/AuthProvider.tsx";

export function ProtectedRoute({ children }: PropsWithChildren) {
  const { status } = useAuth();

  if (status === "booting") {
    return (
      <main className="centered-state">
        <LoadingBlock label="Проверяем активную сессию…" />
      </main>
    );
  }

  if (status === "anonymous") {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
