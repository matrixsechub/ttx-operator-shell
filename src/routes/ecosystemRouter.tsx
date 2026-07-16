import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { FlowTracker } from "../lib/flowTracker";
import { EcosystemSplash } from "../pages/EcosystemSplash";
import { OnboardingWizard } from "../pearl/onboardingWizard";

function EcosystemLayout() {
  return (
    <>
      <FlowTracker />
      <Outlet />
    </>
  );
}

/** Ecosystem surface — primary entry at "/" plus the onboarding wizard. */
export const ecosystemRouter = createBrowserRouter([
  {
    element: <EcosystemLayout />,
    children: [
      { path: "/", element: <EcosystemSplash /> },
      { path: "/onboarding", element: <OnboardingWizard /> },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);
