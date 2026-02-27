import { spawn } from "node:child_process";
import { accessSync, constants } from "node:fs";

const FALLBACK_EDITORS = ["vim", "vi", "nano"];

function which(name: string): string | null {
	const pathDirs = (process.env.PATH ?? "").split(":");
	for (const dir of pathDirs) {
		const fullPath = `${dir}/${name}`;
		try {
			accessSync(fullPath, constants.X_OK);
			return fullPath;
		} catch {
			// not found in this dir
		}
	}
	return null;
}

export function detectEditor(): string | null {
	const fromEnv = process.env.EDITOR ?? process.env.VISUAL;
	if (fromEnv?.trim()) return fromEnv.trim();

	for (const editor of FALLBACK_EDITORS) {
		const path = which(editor);
		if (path) return path;
	}
	return null;
}

export function parseEditorCommand(
	editorCommand: string,
): { command: string; args: string[] } | null {
	const trimmed = editorCommand.trim();
	if (!trimmed) {
		return null;
	}

	const parts = trimmed.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g);
	if (!parts || parts.length === 0) {
		return null;
	}

	const [rawCommand, ...rawArgs] = parts;
	const unquote = (value: string) => {
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			return value.slice(1, -1);
		}
		return value;
	};

	return {
		command: unquote(rawCommand),
		args: rawArgs.map(unquote),
	};
}

export function openInEditor(filePath: string): Promise<void> {
	const editorCommand = detectEditor();
	if (!editorCommand) {
		return Promise.reject(
			new Error("no editor found. Set the EDITOR environment variable"),
		);
	}
	const invocation = parseEditorCommand(editorCommand);
	if (!invocation) {
		return Promise.reject(
			new Error("invalid editor command. Set the EDITOR environment variable"),
		);
	}

	return new Promise((resolve, reject) => {
		const child = spawn(invocation.command, [...invocation.args, filePath], {
			stdio: "inherit",
		});
		child.on("error", reject);
		child.on("close", (code) => {
			if (code === 0) resolve();
			else reject(new Error(`editor exited with code ${code}`));
		});
	});
}
