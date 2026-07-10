import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "../lib/AuthContext";
import { cockpitRouter } from "../routes/cockpitRouter";
import "../styles/index.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

createRoot(rootElement).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={cockpitRouter} />
    </AuthProvider>
  </StrictMode>,
);
