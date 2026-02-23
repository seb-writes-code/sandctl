import { Command } from "commander";

import { findEditor, openInEditor } from "@/commands/template/shared";
import { TemplateAlreadyExistsError, TemplateStore } from "@/template/store";
import type { TemplateConfig } from "@/template/types";

export async function runTemplateAdd(
	name: string,
	store = new TemplateStore(),
): Promise<void> {
	if (!name) {
		throw new Error("template name is required");
	}

	let created: TemplateConfig;
	try {
		created = await store.add(name);
	} catch (error) {
		if (error instanceof TemplateAlreadyExistsError) {
			console.error(
				`Error: Template '${name}' already exists. Use 'sandctl template edit ${name}' to modify it.`,
			);
			return;
		}
		throw new Error(`failed to create template: ${String(error)}`);
	}

	const scriptPath = await store.getInitScriptPath(name);

	console.log(`Created template '${created.original_name}'`);
	console.log("Opening init script in editor...");

	const editor = findEditor();
	if (!editor) {
		console.error(
			"Error: No editor found. Set the EDITOR environment variable.",
		);
		console.log(`Edit your script at: ${scriptPath}`);
		return;
	}

	const exitCode = await openInEditor(editor, scriptPath).catch(
		(error: unknown) => {
			console.error(`Warning: Editor exited with error: ${String(error)}`);
			return 1;
		},
	);

	if (exitCode !== 0) {
		console.error(`Warning: Editor exited with error code ${exitCode}`);
		console.log(`Edit your script at: ${scriptPath}`);
	}

	console.log();
	console.log(
		`Template '${created.original_name}' is ready. Use 'sandctl new -T ${created.template}' to create a session.`,
	);
}

export function registerTemplateAddCommand(): Command {
	return new Command("add")
		.description("Create a new template configuration")
		.argument("<name>")
		.action(async (name: string) => {
			await runTemplateAdd(name);
		});
}
