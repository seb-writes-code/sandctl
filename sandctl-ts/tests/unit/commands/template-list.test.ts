import { describe, expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runTemplateList } from "@/commands/template-list";
import { TemplateStore } from "@/template/store";

describe("template list", () => {
	test("shows table with templates", async () => {
		const root = await mkdtemp(join(tmpdir(), "sandctl-tpl-list-"));
		const store = new TemplateStore(root);
		await store.add("Ghost");
		await store.add("Alpha");

		const output: string[] = [];
		await runTemplateList(store, { log: (msg: string) => output.push(msg) });

		expect(output.some((m) => m.includes("NAME"))).toBe(true);
		expect(output.some((m) => m.includes("Ghost"))).toBe(true);
		expect(output.some((m) => m.includes("Alpha"))).toBe(true);
	});

	test("shows empty message when no templates", async () => {
		const root = await mkdtemp(join(tmpdir(), "sandctl-tpl-list-"));
		const store = new TemplateStore(root);

		const output: string[] = [];
		await runTemplateList(store, { log: (msg: string) => output.push(msg) });

		expect(output.some((m) => m.includes("No templates configured"))).toBe(
			true,
		);
	});
});
