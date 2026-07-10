import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { FlowTracker } from "../lib/flowTracker";
import { EcosystemSplash } from "../pages/EcosystemSplash";

function EcosystemLayout() {
  return (
    <>
      <FlowTracker />
      <Outlet />
    </>
  );
}

/** Ecosystem surface — primary entry at "/" only. */
export const ecosystemRouter = createBrowserRouter([
  {
    element: <EcosystemLayout />,
    children: [
      { path: "/", element: <EcosystemSplash /> },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);
