import { spawn } from "node:child_process";

export function findEditor(
	which: (name: string) => string | null = Bun.which,
): string {
	const environmentEditor = process.env.EDITOR;
	if (environmentEditor) {
		return environmentEditor;
	}

	const visualEditor = process.env.VISUAL;
	if (visualEditor) {
		return visualEditor;
	}

	for (const candidate of ["vim", "vi", "nano"]) {
		const resolved = which(candidate);
		if (resolved) {
			return resolved;
		}
	}

	return "";
}

export async function openInEditor(
	editor: string,
	path: string,
): Promise<number> {
	return await new Promise((resolve, reject) => {
		const child = spawn(editor, [path], { stdio: "inherit" });
		child.on("error", reject);
		child.on("exit", (code) => resolve(code ?? 1));
	});
}
