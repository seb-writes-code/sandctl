import { expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { SessionStore } from "../../src/core/session-store.js";

test("session store is case-insensitive", () => {
  const dir = mkdtempSync(join(tmpdir(), "sandctl-ts-store-"));
  try {
    const path = join(dir, "sessions.json");
    const store = new SessionStore(path);
    store.add({
      id: "MySession",
      provider: "hetzner",
      status: "provisioning",
      created_at: new Date().toISOString()
    });

    expect(store.get("mysession")?.id).toBe("mysession");

    expect(() =>
      store.add({
        id: "MYSESSION",
        provider: "hetzner",
        status: "provisioning",
        created_at: new Date().toISOString()
      })
    ).toThrow();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
