import { Command } from "commander";

import { TemplateNotFoundError, TemplateStore } from "@/template/store";

interface Dependencies {
	write: (content: string) => void;
}

const defaultDependencies: Dependencies = {
	write: (content: string) => process.stdout.write(content),
};

export async function runTemplateShow(
	name: string,
	store = new TemplateStore(),
	deps: Partial<Dependencies> = {},
): Promise<void> {
	const { write } = { ...defaultDependencies, ...deps };

	try {
		const initScript = await store.getInitScript(name);
		const content = initScript.script.endsWith("\n")
			? initScript.script
			: `${initScript.script}\n`;
		write(content);
	} catch (error) {
		if (error instanceof TemplateNotFoundError) {
			throw new Error(
				`template '${name}' not found. Use 'sandctl template list' to see available templates`,
			);
		}
		throw error;
	}
}

export function registerTemplateShowCommand(): Command {
	return new Command("show")
		.description("Display a template's init script")
		.argument("<name>", "Template name")
		.action(async (name: string) => {
			await runTemplateShow(name);
		});
}
