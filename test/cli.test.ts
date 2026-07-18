import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";

describe("CLI", () => {
  it("prints help without starting a session", () => {
    const output = execFileSync("node", ["dist/cli.js", "--help"], { encoding: "utf8" });
    expect(output).toContain("Usage: codecall");
    expect(output).toContain("--from-git");
    expect(output).toContain("$codecall");
  });
});
