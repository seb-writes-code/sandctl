import { Command } from "commander";
import { DateTime } from "luxon";

import { TemplateStore } from "@/template/store";

function formatCreatedAt(value: string): string {
	return DateTime.fromISO(value).toLocal().toFormat("yyyy-MM-dd HH:mm:ss");
}

function outputRows(
	rows: Array<{ name: string; created: string }>,
	headers: [string, string],
): void {
	const firstWidth = Math.max(
		headers[0].length,
		...rows.map((row) => row.name.length),
	);
	console.log(`${headers[0].padEnd(firstWidth)}  ${headers[1]}`);
	for (const row of rows) {
		console.log(`${row.name.padEnd(firstWidth)}  ${row.created}`);
	}
}

export async function runTemplateList(
	store = new TemplateStore(),
): Promise<void> {
	const configs = await store.list();
	if (configs.length === 0) {
		console.log("No templates configured.");
		console.log();
		console.log("Create one with: sandctl template add <name>");
		return;
	}

	outputRows(
		configs.map((config) => ({
			name: config.original_name,
			created: formatCreatedAt(config.created_at),
		})),
		["NAME", "CREATED"],
	);
}

export function registerTemplateListCommand(): Command {
	return new Command("list")
		.description("List all configured templates")
		.action(async () => {
			await runTemplateList();
		});
}
