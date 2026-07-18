import { mkdtempSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { installClaudeSkill, installSkill } from "../src/install-skill.js";

describe("skill installer", () => {
  it("copies the packaged skill to a caller-selected Codex skill directory", () => {
    const root = mkdtempSync(join(tmpdir(), "codecall-skill-"));
    const installed = installSkill(root);

    expect(installed).toBe(join(root, "codecall"));
    expect(existsSync(join(installed, "SKILL.md"))).toBe(true);
    expect(existsSync(join(installed, "agents", "openai.yaml"))).toBe(true);
    expect(existsSync(join(installed, "references", "trigger-policy.md"))).toBe(true);
  });

  it("copies the same skill to a caller-selected Claude Code skill directory", () => {
    const root = mkdtempSync(join(tmpdir(), "codecall-claude-skill-"));
    const installed = installClaudeSkill(root);

    expect(installed).toBe(join(root, "codecall"));
    expect(existsSync(join(installed, "SKILL.md"))).toBe(true);
    expect(existsSync(join(installed, "references", "CLAUDE.codecall.md"))).toBe(true);
  });

  it("removes the legacy learn skill when installing codecall", () => {
    const root = mkdtempSync(join(tmpdir(), "codecall-migration-"));
    mkdirSync(join(root, "learn"));
    writeFileSync(join(root, "learn", "SKILL.md"), "legacy");

    installSkill(root);

    expect(existsSync(join(root, "learn"))).toBe(false);
    expect(existsSync(join(root, "codecall", "SKILL.md"))).toBe(true);
  });
});
