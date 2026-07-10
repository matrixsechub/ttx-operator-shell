export type PublicConversionEnv = {
  PUBLIC_CALENDLY_URL?: string;
  CALENDLY_BOOKING_URL?: string;
  LEAD_NOTIFICATION_EMAIL?: string;
  LEAD_NOTIFICATION_WEBHOOK_URL?: string;
};

export type CalendlyConfig = {
  url: string;
  title: string;
  durationMinutes: number;
};

export type LeadNotificationConfig = {
  recipient: string;
  webhookUrl: string;
};

const CALENDLY_HOST = "calendly.com";

export function resolveCalendlyUrl(env: PublicConversionEnv): string | null {
  const candidate = (env.PUBLIC_CALENDLY_URL ?? env.CALENDLY_BOOKING_URL ?? "").trim();
  if (!candidate) return null;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "https:") return null;
    if (!parsed.hostname.endsWith(CALENDLY_HOST)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function resolveCalendlyConfig(env: PublicConversionEnv): CalendlyConfig | null {
  const url = resolveCalendlyUrl(env);
  if (!url) return null;
  return {
    url,
    title: "MSHOPS Operator Consultation",
    durationMinutes: 30,
  };
}

export function resolveLeadNotificationConfig(env: PublicConversionEnv): LeadNotificationConfig | null {
  const recipient = (env.LEAD_NOTIFICATION_EMAIL ?? "").trim();
  const webhookUrl = (env.LEAD_NOTIFICATION_WEBHOOK_URL ?? "").trim();
  if (!recipient || !webhookUrl) return null;
  try {
    const parsed = new URL(webhookUrl);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  } catch {
    return null;
  }
  return { recipient, webhookUrl };
}

export function summarizeReason(reason: string, maxLength = 240): string {
  const normalized = reason.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1)}…`;
}
