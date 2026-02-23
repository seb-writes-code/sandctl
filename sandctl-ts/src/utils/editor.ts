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
	if (fromEnv) return fromEnv;

	for (const editor of FALLBACK_EDITORS) {
		const path = which(editor);
		if (path) return path;
	}
	return null;
}

export function openInEditor(filePath: string): Promise<void> {
	const editor = detectEditor();
	if (!editor) {
		return Promise.reject(
			new Error("no editor found. Set the EDITOR environment variable"),
		);
	}

	return new Promise((resolve, reject) => {
		const child = spawn(editor, [filePath], { stdio: "inherit" });
		child.on("error", reject);
		child.on("close", (code) => {
			if (code === 0) resolve();
			else reject(new Error(`editor exited with code ${code}`));
		});
	});
}
