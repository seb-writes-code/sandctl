import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { runReap } from "@/commands/reap";
import { clearProviders } from "@/provider";
import type { Provider, SSHKeyManager } from "@/provider/interface";
import { SessionStore } from "@/session/store";
import { baseProviderConfig, makeRunningSession } from "../../support/fixtures";

function makeProvider(deleted: string[]): Provider & SSHKeyManager {
	return {
		name: () => "hetzner",
		create: async () => {
			throw new Error("not implemented");
		},
		get: async () => {
			throw new Error("not implemented");
		},
		delete: async (id: string) => {
			deleted.push(id);
		},
		list: async () => [],
		waitReady: async () => {
			throw new Error("not implemented");
		},
		ensureSSHKey: async () => "1",
	};
}

describe("commands/reap", () => {
	let store: SessionStore;
	let logSpy: ReturnType<typeof spyOn>;
	let warnSpy: ReturnType<typeof spyOn>;

	beforeEach(async () => {
		const dir = await mkdtemp(join(tmpdir(), "sandctl-reap-test-"));
		store = new SessionStore(join(dir, "sessions.json"));
		logSpy = spyOn(console, "log").mockImplementation(() => {});
		warnSpy = spyOn(console, "warn").mockImplementation(() => {});
		clearProviders();
	});

	afterEach(() => {
		logSpy.mockRestore();
		warnSpy.mockRestore();
		clearProviders();
	});

	test("prints message when no expired sessions exist", async () => {
		const result = await runReap({}, store);

		expect(result).toEqual({ reaped: [], skipped: [] });
		expect(logSpy).toHaveBeenCalledWith("No expired sessions found.");
	});

	test("skips sessions with no timeout set", async () => {
		await store.add(makeRunningSession({ id: "notimeout" }));

		const result = await runReap({}, store);

		expect(result.reaped).toEqual([]);
		expect(result.skipped).toEqual(["notimeout"]);
		expect(logSpy).toHaveBeenCalledWith("No expired sessions found.");
	});

	test("skips sessions with time still remaining", async () => {
		await store.add(
			makeRunningSession({
				id: "active",
				created_at: new Date().toISOString(),
				timeout: "24h0m0s",
			}),
		);

		const result = await runReap({}, store);

		expect(result.reaped).toEqual([]);
		expect(result.skipped).toEqual(["active"]);
		expect(logSpy).toHaveBeenCalledWith("No expired sessions found.");
	});

	test("destroys only expired sessions in a mix", async () => {
		const deleted: string[] = [];

		// Expired session: created far in the past with short timeout
		await store.add(
			makeRunningSession({
				id: "expired",
				provider_id: "vm-expired",
				created_at: "2024-01-01T00:00:00Z",
				timeout: "1h0m0s",
			}),
		);

		// Active session: created now with long timeout
		await store.add(
			makeRunningSession({
				id: "active",
				provider_id: "vm-active",
				created_at: new Date().toISOString(),
				timeout: "24h0m0s",
			}),
		);

		// No-timeout session
		await store.add(makeRunningSession({ id: "notimeout" }));

		const result = await runReap({}, store, {
			loadConfig: async () => baseProviderConfig,
			resolveProvider: () => makeProvider(deleted),
		});

		expect(result.reaped).toEqual(["expired"]);
		expect(result.skipped).toContain("active");
		expect(result.skipped).toContain("notimeout");
		expect(deleted).toEqual(["vm-expired"]);
		expect(logSpy).toHaveBeenCalledWith("Reaped 1 session(s).");
	});

	test("dry-run lists expired sessions without destroying", async () => {
		await store.add(
			makeRunningSession({
				id: "expired",
				provider_id: "vm-expired",
				created_at: "2024-01-01T00:00:00Z",
				timeout: "1h0m0s",
			}),
		);

		const result = await runReap({ dryRun: true }, store);

		expect(result.reaped).toEqual(["expired"]);
		// Session should still exist
		const session = await store.get("expired");
		expect(session.id).toBe("expired");
		expect(logSpy).toHaveBeenCalledWith("Expired sessions (dry run):");
		expect(logSpy).toHaveBeenCalledWith("  expired");
	});

	test("json mode suppresses console output and returns result", async () => {
		const deleted: string[] = [];

		await store.add(
			makeRunningSession({
				id: "expired",
				provider_id: "vm-expired",
				created_at: "2024-01-01T00:00:00Z",
				timeout: "1h0m0s",
			}),
		);

		const result = await runReap({ silent: true }, store, {
			loadConfig: async () => baseProviderConfig,
			resolveProvider: () => makeProvider(deleted),
		});

		expect(result.reaped).toEqual(["expired"]);
		expect(deleted).toEqual(["vm-expired"]);
		expect(logSpy).not.toHaveBeenCalled();
	});

	test("warns on individual destroy failures and continues", async () => {
		let callCount = 0;
		const failingProvider: Provider & SSHKeyManager = {
			name: () => "hetzner",
			create: async () => {
				throw new Error("not implemented");
			},
			get: async () => {
				throw new Error("not implemented");
			},
			delete: async () => {
				callCount++;
				if (callCount === 1) throw new Error("cloud API error");
			},
			list: async () => [],
			waitReady: async () => {
				throw new Error("not implemented");
			},
			ensureSSHKey: async () => "1",
		};

		await store.add(
			makeRunningSession({
				id: "failone",
				provider_id: "vm-fail",
				created_at: "2024-01-01T00:00:00Z",
				timeout: "1h0m0s",
			}),
		);

		await store.add(
			makeRunningSession({
				id: "succeedtwo",
				provider_id: "vm-ok",
				created_at: "2024-01-01T00:00:00Z",
				timeout: "1h0m0s",
			}),
		);

		const result = await runReap({}, store, {
			loadConfig: async () => baseProviderConfig,
			resolveProvider: () => failingProvider,
		});

		// First fails, second succeeds
		expect(result.reaped).toEqual(["succeedtwo"]);
		expect(warnSpy).toHaveBeenCalled();
		expect(logSpy).toHaveBeenCalledWith("Reaped 1 session(s).");
	});
});
