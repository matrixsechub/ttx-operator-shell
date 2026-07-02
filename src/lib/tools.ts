// Shared so the About page's "Tools I Use" and the Dashboard's AI Node
// Console don't drift out of sync — they were previously two separate,
// identical, hardcoded lists.
export const OPERATOR_TOOLS = ["Claude", "Cursor", "Codex", "Copilot"] as const;
