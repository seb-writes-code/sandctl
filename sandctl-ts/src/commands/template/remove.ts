import { confirm } from "@inquirer/prompts";
import { Command } from "commander";

import { TemplateNotFoundError, TemplateStore } from "@/template/store";

export async function runTemplateRemove(
	name: string,
	options: { force: boolean },
	store = new TemplateStore(),
): Promise<void> {
	if (!(await store.exists(name))) {
		throw new Error(
			`template '${name}' not found. Use 'sandctl template list' to see available templates`,
		);
	}

	if (!options.force) {
		if (!process.stdin.isTTY) {
			throw new Error(
				"confirmation required. Run in interactive terminal or use --force flag",
			);
		}

		const accepted = await confirm({
			message: `Delete template '${name}'?`,
			default: false,
		});
		if (!accepted) {
			console.log("Canceled.");
			return;
		}
	}

	try {
		await store.remove(name);
	} catch (error) {
		if (error instanceof TemplateNotFoundError) {
			throw new Error(`template '${name}' not found`);
		}
		throw new Error(`failed to remove template: ${String(error)}`);
	}

	console.log(`Template '${name}' deleted.`);
}

export function registerTemplateRemoveCommand(): Command {
	return new Command("remove")
		.description("Delete a template")
		.argument("<name>")
		.option("-f, --force", "Skip confirmation prompt", false)
		.action(async (name: string, options: { force: boolean }) => {
			await runTemplateRemove(name, options);
		});
}
