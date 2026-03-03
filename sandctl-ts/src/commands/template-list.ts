import { Command } from "commander";
import { DateTime } from "luxon";

import { TemplateStore } from "@/template/store";

interface Dependencies {
	log: (message: string) => void;
}

const defaultDependencies: Dependencies = {
	log: (message: string) => console.log(message),
};

function formatCreatedAt(iso: string): string {
	const dt = DateTime.fromISO(iso);
	if (!dt.isValid) return "(invalid date)";
	return dt.toLocal().toFormat("yyyy-MM-dd HH:mm:ss");
}

export async function runTemplateList(
	store = new TemplateStore(),
	deps: Partial<Dependencies> = {},
): Promise<void> {
	const { log } = { ...defaultDependencies, ...deps };

	const configs = await store.list();

	if (configs.length === 0) {
		log("No templates configured.");
		log("");
		log("Create one with: sandctl template add <name>");
		return;
	}

	const COL_WIDTH = 20;
	log(`${"NAME".padEnd(COL_WIDTH)} CREATED`);
	for (const config of configs) {
		const name =
			config.original_name.length > COL_WIDTH
				? `${config.original_name.substring(0, COL_WIDTH - 1)}…`
				: config.original_name.padEnd(COL_WIDTH);
		log(`${name} ${formatCreatedAt(config.created_at)}`);
	}
}

export function registerTemplateListCommand(): Command {
	return new Command("list")
		.description("List all configured templates")
		.action(async () => {
			await runTemplateList();
		});
}
