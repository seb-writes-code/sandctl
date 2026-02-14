import { expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadConfig, saveConfig } from "../../src/core/config.js";

test("config round-trip", () => {
  const dir = mkdtempSync(join(tmpdir(), "sandctl-ts-config-"));
  try {
    const path = join(dir, "config");
    saveConfig({ default_provider: "hetzner", providers: { hetzner: { token: "abc" } } }, path);
    const loaded = loadConfig(path);
    expect(loaded.providers.hetzner?.token).toBe("abc");
    expect(loaded.default_provider).toBe("hetzner");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
