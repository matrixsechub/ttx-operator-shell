import { mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import type { RefactorApprovalResult } from "../governance/approveRefactor.ts";
import type {
  RefactorActionKind,
  RefactorApplyResult,
  RefactorPlan,
  RefactorPlanAction,
} from "./types.ts";
import { BARREL_FORBIDDEN_DIRS, BEACON_PROTECTED_PATHS } from "./types.ts";
import { isBeaconPath, normalizePath } from "./utils/fileScanner.ts";
import { rewriteImportSpecifier } from "./utils/importGraph.ts";

function isProtectedPath(relativePath: string): boolean {
  const normalized = normalizePath(relativePath);
  if (isBeaconPath(normalized)) return true;
  return (BEACON_PROTECTED_PATHS as readonly string[]).some(
    (p) => normalized === p || normalized.endsWith(`/${p}`),
  );
}

function isBarrelForbidden(action: RefactorPlanAction): boolean {
  if (action.action !== "create-barrel") return false;
  const dir = action.relativePath.replace(/\/index\.ts$/, "");
  return (BARREL_FORBIDDEN_DIRS as readonly string[]).some(
    (d) => dir === d || dir.startsWith(`${d}/`),
  );
}

function ensureParentDir(absPath: string): void {
  mkdirSync(dirname(absPath), { recursive: true });
}

function updateImportsForMove(repoRoot: string, oldPath: string, newPath: string): string[] {
  const touched: string[] = [];
  const importRe =
    /(?:import\s+(?:type\s+)?(?:[^"'\n]+from\s+)?|export\s+(?:type\s+)?(?:\{[^}]*\}|\*)\s+from\s+)["']([^"']+)["']/g;

  function walkAndUpdate(absDir: string): void {
    let entries: string[];
    try {
      entries = readdirSync(absDir);
    } catch {
      return;
    }
    for (const entry of entries) {
      const abs = join(absDir, entry);
      try {
        const stat = statSync(abs);
        if (stat.isDirectory()) {
          if (["node_modules", "dist", ".wrangler", ".artifacts"].includes(entry)) continue;
          walkAndUpdate(abs);
          continue;
        }
        if (!/\.(ts|tsx)$/.test(entry)) continue;

        const fromFile = normalizePath(relative(repoRoot, abs));
        let content = readFileSync(abs, "utf8");
        let changed = false;

        content = content.replace(importRe, (full, specifier: string) => {
          const rewritten = rewriteImportSpecifier(fromFile, oldPath, newPath, specifier);
          if (rewritten && rewritten !== specifier) {
            changed = true;
            return full.replace(specifier, rewritten);
          }
          return full;
        });

        if (changed) {
          writeFileSync(abs, content, "utf8");
          touched.push(fromFile);
        }
      } catch {
        continue;
      }
    }
  }

  for (const root of ["src", "worker", "msh-ops", "scripts", "tests"]) {
    walkAndUpdate(join(repoRoot, root));
  }

  return touched;
}

function applyAction(
  repoRoot: string,
  action: RefactorPlanAction,
): { ok: boolean; message: string; touched: string[] } {
  if (isProtectedPath(action.relativePath) || (action.targetPath && isProtectedPath(action.targetPath))) {
    return { ok: false, message: `Blocked: Beacon path is read-only (${action.relativePath})`, touched: [] };
  }

  if (isBarrelForbidden(action)) {
    return { ok: false, message: "Blocked: barrel creation forbidden in src/components and src/pages", touched: [] };
  }

  const absFrom = join(repoRoot, action.relativePath);

  switch (action.action) {
    case "move-file":
    case "rename-file": {
      if (!action.targetPath) {
        return { ok: false, message: "Missing targetPath for move/rename", touched: [] };
      }
      const absTo = join(repoRoot, action.targetPath);
      ensureParentDir(absTo);
      renameSync(absFrom, absTo);
      const importTouched = updateImportsForMove(repoRoot, action.relativePath, action.targetPath);
      return {
        ok: true,
        message: `Moved ${action.relativePath} → ${action.targetPath}`,
        touched: [action.relativePath, action.targetPath, ...importTouched],
      };
    }
    case "remove-dead-code": {
      rmSync(absFrom, { force: true });
      return {
        ok: true,
        message: `Removed ${action.relativePath}`,
        touched: [action.relativePath],
      };
    }
    case "update-imports": {
      return { ok: true, message: "Import updates are applied as part of move/rename actions", touched: [] };
    }
    case "create-barrel": {
      return { ok: false, message: "Barrel creation is report-only per project policy", touched: [] };
    }
    default: {
      const _exhaustive: never = action.action;
      void _exhaustive;
      return { ok: false, message: "Unknown action", touched: [] };
    }
  }
}

export function buildRefactorPlan(
  actions: RefactorPlanAction[],
  description: string,
): RefactorPlan {
  return { actions, description };
}

export function planFromSuggestionIds(
  suggestions: { id: string; action: RefactorActionKind; relativePath: string; targetPath?: string }[],
  approvedIds: string[],
): RefactorPlan {
  const approved = new Set(approvedIds);
  const actions: RefactorPlanAction[] = suggestions
    .filter((s) => approved.has(s.id))
    .map((s) => ({
      suggestionId: s.id,
      action: s.action,
      relativePath: s.relativePath,
      targetPath: s.targetPath,
    }));

  return {
    actions,
    description: `Apply ${actions.length} approved refactor action(s)`,
  };
}

export async function applyRefactorPlan(
  repoRoot: string,
  plan: RefactorPlan,
  approval: RefactorApprovalResult,
): Promise<RefactorApplyResult> {
  if (approval.decision !== "approved") {
    throw new Error(`Refactor denied: ${approval.reason}`);
  }

  const applied: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];

  for (const action of plan.actions) {
    if (!approval.suggestionIds.includes(action.suggestionId)) {
      skipped.push(`${action.suggestionId}: not in approval list`);
      continue;
    }

    const result = applyAction(repoRoot, action);
    if (result.ok) {
      applied.push(...result.touched);
    } else {
      errors.push(`${action.suggestionId}: ${result.message}`);
    }
  }

  return {
    applied: [...new Set(applied)],
    skipped,
    errors,
  };
}
