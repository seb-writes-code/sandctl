import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

/** Resolves the path to the compiled sandctl binary. */
export function getBinaryPath(): string {
  const repoRoot = join(import.meta.dirname, "..", "..");
  const binaryPath = join(repoRoot, "sandctl");
  if (!existsSync(binaryPath)) {
    throw new Error(
      `sandctl binary not found at ${binaryPath}. Run 'make build' or 'bun run build' first.`,
    );
  }
  return binaryPath;
}

export interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/** Runs the sandctl binary with the given arguments and returns captured output. */
export function runSandctl(args: string[], env?: NodeJS.ProcessEnv): RunResult {
  const binaryPath = getBinaryPath();
  const result = spawnSync(binaryPath, args, {
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    exitCode: result.status ?? 1,
  };
}
