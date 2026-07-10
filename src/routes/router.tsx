import { createBrowserRouter, Navigate } from "react-router-dom";

import { RequireAuth } from "../lib/RequireAuth";

import { Login } from "../pages/Login";

import { EcosystemSplash } from "../pages/EcosystemSplash";
import { Landing } from "../pages/Landing";

import { Dashboard } from "../pages/Dashboard";

import { Marketplace } from "../pages/Marketplace";

import { Status } from "../pages/Status";

import { AboutPage } from "../pages/AboutPage";

import { NotFound } from "../pages/NotFound";
import LiveJoin from "../pages/LiveJoin";



import { DivisionsIndex } from "../pages/divisions/DivisionsIndex";

import { DivisionPage } from "../pages/divisions/DivisionPage";



import { MarketplaceCategoryPage } from "../pages/marketplace/MarketplaceCategoryPage";



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



export const router = createBrowserRouter([

  { path: "/", element: <EcosystemSplash /> },
  { path: "/enter", element: <Landing /> },

  { path: "/login", element: <Login /> },
  { path: "/join", element: <LiveJoin /> },

  { path: "/marketplace", element: <Marketplace /> },

  { path: "/marketplace/:category", element: <MarketplaceCategoryPage /> },



  {

    element: <RequireAuth />,

    children: [

      { path: "/dashboard", element: <Dashboard /> },

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


