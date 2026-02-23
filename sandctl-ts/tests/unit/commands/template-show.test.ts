import { describe, expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
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
});
