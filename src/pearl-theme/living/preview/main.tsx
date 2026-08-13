import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../../pearl-theme.css";
import "../living.css";
import { LivingShowcase } from "./LivingShowcase";

const el = document.getElementById("pearl-root");
if (el) {
  createRoot(el).render(
    <StrictMode>
      <LivingShowcase />
    </StrictMode>,
  );
}
