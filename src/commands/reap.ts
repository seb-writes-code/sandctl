import { Command } from "commander";

import type { Config, ProviderConfig } from "@/config/config";
import type { get as getProviderFromRegistry } from "@/provider/registry";
import { SessionStore } from "@/session/store";
import type { Session } from "@/session/types";
import { timeoutRemaining } from "@/session/types";
import { runDestroy } from "./destroy";

export interface ReapResult {
	reaped: string[];
	skipped: string[];
}

interface Dependencies {
	loadConfig: (configPath?: string) => Promise<Config>;
	resolveProvider: (
		name: string,
		config: ProviderConfig,
	) => ReturnType<typeof getProviderFromRegistry>;
}

export async function runReap(
	options: { dryRun?: boolean; silent?: boolean },
	store = new SessionStore(),
	deps: Partial<Dependencies> = {},
	configPath?: string,
): Promise<ReapResult> {
	const sessions = await store.listActive();

	const expired: Session[] = [];
	const skipped: string[] = [];

	for (const session of sessions) {
		const remaining = timeoutRemaining(session);
		if (remaining === 0) {
			expired.push(session);
		} else {
			skipped.push(session.id);
		}
	}

	if (expired.length === 0) {
		if (!options.silent) {
			console.log("No expired sessions found.");
		}
		return { reaped: [], skipped };
	}

	if (options.dryRun) {
		if (!options.silent) {
			console.log("Expired sessions (dry run):");
			for (const session of expired) {
				console.log(`  ${session.id}`);
			}
		}
		return { reaped: expired.map((s) => s.id), skipped };
	}

	const reaped: string[] = [];

	for (const session of expired) {
		try {
			await runDestroy(
				session.id,
				{ force: true, silent: true },
				store,
				deps,
				configPath,
			);
			reaped.push(session.id);
		} catch (error) {
			if (!options.silent) {
				const msg = error instanceof Error ? error.message : String(error);
				console.warn(`[warn] Failed to reap '${session.id}': ${msg}`);
			}
		}
	}

	if (!options.silent) {
		console.log(`Reaped ${reaped.length} session(s).`);
	}

	return { reaped, skipped };
}

export function registerReapCommand(): Command {
	return new Command("reap")
		.alias("cleanup")
		.description("Destroy all sessions whose timeout has expired")
		.option("-n, --dry-run", "List expired sessions without destroying", false)
		.action(async (options: { dryRun: boolean }, command) => {
			const globals = command.optsWithGlobals() as {
				config?: string;
				json?: boolean;
			};
			const result = await runReap(
				{ ...options, silent: globals.json },
				undefined,
				undefined,
				globals.config,
			);
			if (globals.json) {
				console.log(JSON.stringify(result, null, 2));
			}
		});
}
