import { describe, expect, mock, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runTemplateAdd } from "@/commands/template-add";
import { TemplateStore } from "@/template/store";

describe("template add", () => {
	test("creates template and reports success", async () => {
		const root = await mkdtemp(join(tmpdir(), "sandctl-tpl-add-"));
		const store = new TemplateStore(root);
		const output: string[] = [];
		const openEditor = mock(async () => {});

		await runTemplateAdd("Ghost", store, {
			log: (msg: string) => output.push(msg),
			errLog: (msg: string) => output.push(msg),
			openEditor,
		});

		expect(await store.exists("Ghost")).toBe(true);
		expect(openEditor).toHaveBeenCalledTimes(1);
		expect(output.some((m) => m.includes("Ghost"))).toBe(true);
	});

	test("shows error for duplicate template", async () => {
		const root = await mkdtemp(join(tmpdir(), "sandctl-tpl-add-"));
		const store = new TemplateStore(root);
		await store.add("Ghost");

		const errors: string[] = [];
		const openEditor = mock(async () => {});

		await runTemplateAdd("Ghost", store, {
			log: () => {},
			errLog: (msg: string) => errors.push(msg),
			openEditor,
		});

		expect(openEditor).not.toHaveBeenCalled();
		expect(errors.some((m) => m.includes("already exists"))).toBe(true);
	});

	test("throws for empty name", async () => {
		const root = await mkdtemp(join(tmpdir(), "sandctl-tpl-add-"));
		const store = new TemplateStore(root);

		await expect(
			runTemplateAdd("", store, {
				log: () => {},
				errLog: () => {},
				openEditor: async () => {},
			}),
		).rejects.toThrow("template name is required");
	});

	test("falls back gracefully when editor fails", async () => {
		const root = await mkdtemp(join(tmpdir(), "sandctl-tpl-add-"));
		const store = new TemplateStore(root);
		const output: string[] = [];
		const openEditor = mock(async () => {
			throw new Error("editor crashed");
		});

		await runTemplateAdd("Ghost", store, {
			log: (msg: string) => output.push(msg),
			errLog: (msg: string) => output.push(msg),
			openEditor,
		});

		expect(await store.exists("Ghost")).toBe(true);
		expect(output.some((m) => m.includes("init.sh"))).toBe(true);
	});
});
