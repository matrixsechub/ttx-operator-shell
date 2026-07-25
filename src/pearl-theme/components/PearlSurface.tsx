import type { ReactNode } from "react";

/**
 * PearlSurface — the scoped, reversible theme boundary.
 * Sets data-theme="pearl" on a real element; everything inside renders in the
 * pearl chamber. Nothing outside is affected (op-* theme untouched).
 */
export function PearlSurface({ children, as: Tag = "div", className = "" }: {
  children: ReactNode;
  as?: "div" | "main" | "section";
  className?: string;
}) {
  return (
    <Tag data-theme="pearl" className={className}>
      {children}
    </Tag>
  );
}
