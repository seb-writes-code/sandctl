import { Command } from "commander";

import { TemplateNotFoundError, TemplateStore } from "@/template/store";
import { openInEditor } from "@/utils/editor";

interface Dependencies {
	openEditor: (filePath: string) => Promise<void>;
}

const defaultDependencies: Dependencies = {
	openEditor: openInEditor,
};

export async function runTemplateEdit(
	name: string,
	store = new TemplateStore(),
	deps: Partial<Dependencies> = {},
): Promise<void> {
	const { openEditor: edit } = { ...defaultDependencies, ...deps };

	let scriptPath: string;
	try {
		scriptPath = await store.getInitScriptPath(name);
	} catch (error) {
		if (error instanceof TemplateNotFoundError) {
			throw new Error(
				`template '${name}' not found. Use 'sandctl template list' to see available templates`,
			);
		}
		throw error;
	}

	await edit(scriptPath);
}

export function registerTemplateEditCommand(): Command {
	return new Command("edit")
		.description("Edit a template's init script")
		.argument("<name>", "Template name")
		.action(async (name: string) => {
			await runTemplateEdit(name);
		});
}
