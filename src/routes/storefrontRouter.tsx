import { createBrowserRouter, Navigate } from "react-router-dom";
import { StorefrontMarketplace } from "../pages/StorefrontMarketplace";
import { StorefrontCategoryPage } from "../pages/StorefrontCategoryPage";

/** Public storefront surface — /marketplace and category routes. */
export const storefrontRouter = createBrowserRouter([
  { path: "/", element: <Navigate to="/marketplace" replace /> },
  { path: "/marketplace", element: <StorefrontMarketplace /> },
  { path: "/marketplace/:category", element: <StorefrontCategoryPage /> },
  { path: "/storefront", element: <Navigate to="/marketplace" replace /> },
  { path: "*", element: <Navigate to="/marketplace" replace /> },
]);
