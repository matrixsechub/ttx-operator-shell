import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { FlowTracker } from "../lib/flowTracker";
import { StorefrontMarketplace } from "../pages/StorefrontMarketplace";
import { StorefrontCategoryPage } from "../pages/StorefrontCategoryPage";

function StorefrontLayout() {
  return (
    <>
      <FlowTracker />
      <Outlet />
    </>
  );
}

/** Public storefront surface — /marketplace and category routes.
 *  PRISM capture mounts here (public surface); operator surfaces
 *  (cockpit/auth/council) stay capture-free by policy. */
export const storefrontRouter = createBrowserRouter([
  {
    element: <StorefrontLayout />,
    children: [
      { path: "/", element: <Navigate to="/marketplace" replace /> },
      { path: "/marketplace", element: <StorefrontMarketplace /> },
      { path: "/marketplace/:category", element: <StorefrontCategoryPage /> },
      { path: "/storefront", element: <Navigate to="/marketplace" replace /> },
      { path: "*", element: <Navigate to="/marketplace" replace /> },
    ],
  },
]);
