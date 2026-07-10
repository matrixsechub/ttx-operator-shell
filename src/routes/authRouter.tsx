import { createBrowserRouter, Navigate } from "react-router-dom";
import { Login } from "../pages/Login";

/** Auth surface — isolated login entry only. */
export const authRouter = createBrowserRouter([
  { path: "/login", element: <Login /> },
  { path: "*", element: <Navigate to="/login" replace /> },
]);
