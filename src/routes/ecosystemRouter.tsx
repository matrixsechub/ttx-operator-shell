import { createBrowserRouter, Navigate } from "react-router-dom";
import { EcosystemSplash } from "../pages/EcosystemSplash";

/** Ecosystem surface — primary entry at "/" only. */
export const ecosystemRouter = createBrowserRouter([
  { path: "/", element: <EcosystemSplash /> },
  { path: "*", element: <Navigate to="/" replace /> },
]);
