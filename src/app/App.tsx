import { RouterProvider } from "react-router-dom";

import { AuthProvider } from "./providers/AuthProvider.tsx";
import { router } from "./router.tsx";

export function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
