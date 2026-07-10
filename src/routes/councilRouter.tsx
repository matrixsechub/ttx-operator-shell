import { createBrowserRouter, Navigate } from "react-router-dom";
import { CouncilPage } from "../pages/CouncilPage";

/** Governance surface — council and policy routes only. */
export const councilRouter = createBrowserRouter([
  { path: "/council", element: <CouncilPage /> },
  { path: "*", element: <Navigate to="/council" replace /> },
]);
