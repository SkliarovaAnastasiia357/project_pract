import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/700.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/700.css";

import React from "react";
import ReactDOM from "react-dom/client";

import { App } from "./app/App.tsx";
import "./styles.css";

// One-time cleanup of legacy mockApi storage for users migrating from mock to http mode.
if (import.meta.env.VITE_API_MODE !== "mock" && typeof window !== "undefined") {
  try {
    window.localStorage.removeItem("teamnova.mock-db.v1");
  } catch {
    // localStorage may be unavailable in some contexts — ignore.
  }
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
