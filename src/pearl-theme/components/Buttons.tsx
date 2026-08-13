import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode };

/**
 * GoldActionButton — governance / champagne-gold authority action.
 * A real <button> (keyboard-operable, focus-visible via theme). No color
 * inversion; the metallic fill is a surface token, the label is dark ink.
 */
export function GoldActionButton({ children, className = "", type = "button", ...rest }: Props) {
  return (
    <button type={type} className={`pearl-gold-btn pearl-focusable ${className}`} {...rest}>
      {children}
    </button>
  );
}

/** Secondary glass action. */
export function SecondaryButton({ children, className = "", type = "button", ...rest }: Props) {
  return (
    <button type={type} className={`pearl-btn-secondary pearl-focusable ${className}`} {...rest}>
      {children}
    </button>
  );
}
