import { describe, expect, mock, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runTemplateRemove } from "@/commands/template-remove";
import { TemplateStore } from "@/template/store";

describe("template remove", () => {
	test("removes template with --force", async () => {
		const root = await mkdtemp(join(tmpdir(), "sandctl-tpl-rm-"));
		const store = new TemplateStore(root);
		await store.add("Ghost");

		const output: string[] = [];
		await runTemplateRemove("Ghost", { force: true }, store, {
			log: (msg: string) => output.push(msg),
			confirm: async () => true,
		});

		expect(await store.exists("Ghost")).toBe(false);
		expect(output.some((m) => m.includes("deleted"))).toBe(true);
	});

	test("prompts for confirmation without --force", async () => {
		const root = await mkdtemp(join(tmpdir(), "sandctl-tpl-rm-"));
		const store = new TemplateStore(root);
		await store.add("Ghost");

		const confirmFn = mock(async () => true);
		await runTemplateRemove("Ghost", { force: false }, store, {
			log: () => {},
			confirm: confirmFn,
		});

		expect(confirmFn).toHaveBeenCalledTimes(1);
		expect(await store.exists("Ghost")).toBe(false);
	});

	test("cancels when confirmation denied", async () => {
		const root = await mkdtemp(join(tmpdir(), "sandctl-tpl-rm-"));
		const store = new TemplateStore(root);
		await store.add("Ghost");

		const output: string[] = [];
		await runTemplateRemove("Ghost", { force: false }, store, {
			log: (msg: string) => output.push(msg),
			confirm: async () => false,
		});

		expect(await store.exists("Ghost")).toBe(true);
		expect(output.some((m) => m.includes("Canceled"))).toBe(true);
	});

	test("throws for non-existent template", async () => {
		const root = await mkdtemp(join(tmpdir(), "sandctl-tpl-rm-"));
		const store = new TemplateStore(root);

		await expect(
			runTemplateRemove("Nope", { force: true }, store, {
				log: () => {},
				confirm: async () => true,
			}),
		).rejects.toThrow(/not found/);
	});
});
