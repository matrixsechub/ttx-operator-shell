import { createBrowserRouter, Navigate } from "react-router-dom";
import { RequireAuth } from "../lib/RequireAuth";
import { Dashboard } from "../pages/Dashboard";
import { Status } from "../pages/Status";
import { AboutPage } from "../pages/AboutPage";
import { NotFound } from "../pages/NotFound";
import { DivisionsIndex } from "../pages/divisions/DivisionsIndex";
import { DivisionPage } from "../pages/divisions/DivisionPage";
import { SystemsIndex } from "../pages/systems/SystemsIndex";
import { SystemDetail } from "../pages/systems/SystemDetail";
import { TTXShell } from "../operator/ttx";
import { TTXBuilder } from "../operator/ttx/builder";
import { TTXInjects } from "../operator/ttx/injects";
import { TTXTimeline } from "../operator/ttx/timeline";
import { TTXRoles } from "../operator/ttx/roles";
import { TTXScore } from "../operator/ttx/score";
import { TTXPacksCategory } from "../pages/marketplace/TTXPacksCategory";
import { FutureIndex } from "../future/FutureIndex";
import { FutureModulePage } from "../future/FutureModulePage";
import { FedGradeOps } from "../pages/ops/FedGradeOps";
import { SecurityOps } from "../pages/ops/SecurityOps";
import { DeployOps } from "../pages/ops/DeployOps";
import LiveJoin from "../pages/LiveJoin";
import { FlywheelDashboard } from "../pages/dashboard/FlywheelDashboard";

/** Operator cockpit surface — systems, ops, divisions, ttx (no storefront/auth routes). */
export const cockpitRouter = createBrowserRouter([
  // /join is public — join token is the auth, no operator session required.
  { path: "/join", element: <LiveJoin /> },
  {
    element: <RequireAuth />,
    children: [
      { path: "/dashboard", element: <Dashboard /> },
      { path: "/dashboard/flywheel", element: <FlywheelDashboard /> },
      { path: "/status", element: <Status /> },
      { path: "/about", element: <AboutPage /> },
      { path: "/divisions", element: <DivisionsIndex /> },
      { path: "/divisions/:slug", element: <DivisionPage /> },
      { path: "/systems", element: <SystemsIndex /> },
      { path: "/systems/:slug", element: <SystemDetail /> },
      {
        path: "/ttx",
        element: <TTXShell />,
        children: [
          { index: true, element: <Navigate to="/ttx/builder" replace /> },
          { path: "builder", element: <TTXBuilder /> },
          { path: "injects", element: <TTXInjects /> },
          { path: "timeline", element: <TTXTimeline /> },
          { path: "roles", element: <TTXRoles /> },
          { path: "score", element: <TTXScore /> },
          { path: "packs", element: <TTXPacksCategory embedded /> },
        ],
      },
      { path: "/future", element: <FutureIndex /> },
      { path: "/future/:slug", element: <FutureModulePage /> },
      { path: "/ops/fedgrade", element: <FedGradeOps /> },
      { path: "/ops/security", element: <SecurityOps /> },
      { path: "/ops/deploy", element: <DeployOps /> },
    ],
  },
  { path: "*", element: <NotFound /> },
]);
