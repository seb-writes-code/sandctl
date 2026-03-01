import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runTemplateShow } from "@/commands/template-show";
import { TemplateStore } from "@/template/store";

describe("template show", () => {
	test("prints init script content to output", async () => {
		const root = await mkdtemp(join(tmpdir(), "sandctl-tpl-show-"));
		const store = new TemplateStore(root);
		await store.add("Ghost");

		const output: string[] = [];
		await runTemplateShow("Ghost", store, {
			write: (msg: string) => output.push(msg),
		});

		const joined = output.join("");
		expect(joined).toContain("#!/bin/bash");
		expect(joined).toContain("Ghost");
	});

	test("throws for non-existent template", async () => {
		const root = await mkdtemp(join(tmpdir(), "sandctl-tpl-show-"));
		const store = new TemplateStore(root);

		await expect(
			runTemplateShow("Nope", store, { write: () => {} }),
		).rejects.toThrow(/not found/);
	});

	test("output always ends with a trailing newline", async () => {
		// Write an init.sh without a trailing newline to test the guarantee
		const root = await mkdtemp(join(tmpdir(), "sandctl-tpl-show-"));
		const store = new TemplateStore(root);
		await store.add("Ghost");

		// Overwrite the generated init.sh with one that has no trailing newline
		const scriptPath = join(root, "ghost", "init.sh");
		await writeFile(scriptPath, "#!/bin/bash\necho hello");

		const output: string[] = [];
		await runTemplateShow("Ghost", store, {
			write: (msg: string) => output.push(msg),
		});

		const joined = output.join("");
		expect(joined.endsWith("\n")).toBe(true);
	});
});
