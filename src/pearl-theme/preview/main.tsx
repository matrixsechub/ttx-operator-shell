import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../pearl-theme.css";
import { PearlShowcase } from "./PearlShowcase";

const el = document.getElementById("pearl-root");
if (el) {
  createRoot(el).render(
    <StrictMode>
      <PearlShowcase />
    </StrictMode>,
  );
}
