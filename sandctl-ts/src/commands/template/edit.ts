import { Command } from "commander";

import { findEditor, openInEditor } from "@/commands/template/shared";
import { TemplateNotFoundError, TemplateStore } from "@/template/store";

export async function runTemplateEdit(
	name: string,
	store = new TemplateStore(),
): Promise<void> {
	let scriptPath: string;
	try {
		scriptPath = await store.getInitScriptPath(name);
	} catch (error) {
		if (error instanceof TemplateNotFoundError) {
			throw new Error(
				`template '${name}' not found. Use 'sandctl template list' to see available templates`,
			);
		}
		throw new Error(`failed to get template: ${String(error)}`);
	}

	const editor = findEditor();
	if (!editor) {
		throw new Error("no editor found. Set the EDITOR environment variable");
	}

	const exitCode = await openInEditor(editor, scriptPath);
	if (exitCode !== 0) {
		throw new Error(`editor exited with error code ${exitCode}`);
	}
}

export function registerTemplateEditCommand(): Command {
	return new Command("edit")
		.description("Edit a template's init script")
		.argument("<name>")
		.action(async (name: string) => {
			await runTemplateEdit(name);
		});
}
