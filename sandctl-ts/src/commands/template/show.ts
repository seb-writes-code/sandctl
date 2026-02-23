import { Command } from "commander";

import { TemplateNotFoundError, TemplateStore } from "@/template/store";

export async function runTemplateShow(
	name: string,
	store = new TemplateStore(),
): Promise<void> {
	try {
		const script = await store.getInitScript(name);
		process.stdout.write(script.script);
	} catch (error) {
		if (error instanceof TemplateNotFoundError) {
			throw new Error(
				`template '${name}' not found. Use 'sandctl template list' to see available templates`,
			);
		}
		throw new Error(`failed to read template: ${String(error)}`);
	}
}

export function registerTemplateShowCommand(): Command {
	return new Command("show")
		.description("Display a template's init script")
		.argument("<name>")
		.action(async (name: string) => {
			await runTemplateShow(name);
		});
}
