import { beforeAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { runSandctl } from "./helpers.js";

// Build the binary once before all tests.
beforeAll(() => {
  const repoRoot = join(import.meta.dirname, "..", "..");
  const result = spawnSync("bun", ["run", "build"], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error("Failed to build sandctl binary before E2E tests");
  }
});

describe("sandctl version", () => {
  test("displays version information", () => {
    const { stdout, stderr, exitCode } = runSandctl(["version"]);
    expect(exitCode).toBe(0);
    const combined = stdout + stderr;
    expect(combined).toContain("sandctl version");
    expect(combined).toContain("commit:");
    expect(combined).toContain("built:");
  });
});

describe("sandctl --help", () => {
  test("displays usage information", () => {
    const { stdout, stderr, exitCode } = runSandctl(["--help"]);
    expect(exitCode).toBe(0);
    const combined = stdout + stderr;
    expect(combined).toContain("sandctl");
    expect(combined).toContain("Usage");
  });
});
