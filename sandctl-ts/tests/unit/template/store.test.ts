import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
	TemplateAlreadyExistsError,
	TemplateNotFoundError,
	TemplateStore,
} from "@/template/store";

describe("template/store", () => {
	test("loads init script from normalized template directory", async () => {
		const root = await mkdtemp(join(tmpdir(), "sandctl-template-store-test-"));
		const templateDir = join(root, "my-api");
		await mkdir(templateDir, { recursive: true });
		await writeFile(join(templateDir, "init.sh"), "#!/bin/sh\necho hi\n");

		const store = new TemplateStore(root);
		const loaded = await store.getInitScript("My API");

		expect(loaded).toEqual({
			name: "My API",
			normalized: "my-api",
			script: "#!/bin/sh\necho hi\n",
		});
	});

	test("throws TemplateNotFoundError when template script is missing", async () => {
		const root = await mkdtemp(join(tmpdir(), "sandctl-template-store-test-"));
		const store = new TemplateStore(root);

		await expect(store.getInitScript("Ghost")).rejects.toBeInstanceOf(
			TemplateNotFoundError,
		);
	});

	test("throws TemplateNotFoundError when template name normalizes to empty", async () => {
		const root = await mkdtemp(join(tmpdir(), "sandctl-template-store-test-"));
		await writeFile(join(root, "init.sh"), "#!/bin/sh\necho base\n");
		const store = new TemplateStore(root);

		await expect(store.getInitScript("   ")).rejects.toBeInstanceOf(
			TemplateNotFoundError,
		);
		await expect(store.getInitScript("!!!")).rejects.toBeInstanceOf(
			TemplateNotFoundError,
		);
	});

	test("add creates template directory with config.yaml and init.sh", async () => {
		const root = await mkdtemp(join(tmpdir(), "sandctl-template-store-test-"));
		const store = new TemplateStore(root);

		const config = await store.add("Ghost");

		expect(config.template).toBe("ghost");
		expect(config.original_name).toBe("Ghost");
		expect(config.created_at).toBeTruthy();

		// Verify config.yaml exists
		const configStat = await stat(join(root, "ghost", "config.yaml"));
		expect(configStat.mode & 0o777).toBe(0o600);

		// Verify init.sh exists and is executable
		const scriptStat = await stat(join(root, "ghost", "init.sh"));
		expect(scriptStat.mode & 0o777).toBe(0o700);
	});

	test("add throws TemplateAlreadyExistsError for duplicate", async () => {
		const root = await mkdtemp(join(tmpdir(), "sandctl-template-store-test-"));
		const store = new TemplateStore(root);

		await store.add("Ghost");
		await expect(store.add("Ghost")).rejects.toBeInstanceOf(
			TemplateAlreadyExistsError,
		);
	});

	test("add throws for empty name", async () => {
		const root = await mkdtemp(join(tmpdir(), "sandctl-template-store-test-"));
		const store = new TemplateStore(root);

		await expect(store.add("")).rejects.toThrow("template name is required");
		await expect(store.add("!!!")).rejects.toThrow("template name is required");
	});

	test("get returns template config from config.yaml", async () => {
		const root = await mkdtemp(join(tmpdir(), "sandctl-template-store-test-"));
		const store = new TemplateStore(root);
		await store.add("Ghost");

		const config = await store.get("Ghost");
		expect(config.template).toBe("ghost");
		expect(config.original_name).toBe("Ghost");
	});

	test("get throws TemplateNotFoundError for missing template", async () => {
		const root = await mkdtemp(join(tmpdir(), "sandctl-template-store-test-"));
		const store = new TemplateStore(root);

		await expect(store.get("Nope")).rejects.toBeInstanceOf(
			TemplateNotFoundError,
		);
	});

	test("list returns all templates sorted by created_at", async () => {
		const root = await mkdtemp(join(tmpdir(), "sandctl-template-store-test-"));
		const store = new TemplateStore(root);

		await store.add("Alpha");
		// Small delay ensures distinct created_at timestamps for reliable sort order
		await new Promise((r) => setTimeout(r, 10));
		await store.add("Beta");

		const templates = await store.list();
		expect(templates).toHaveLength(2);
		expect(templates[0].original_name).toBe("Alpha");
		expect(templates[1].original_name).toBe("Beta");
	});

	test("list returns empty array when no templates exist", async () => {
		const root = await mkdtemp(join(tmpdir(), "sandctl-template-store-test-"));
		const store = new TemplateStore(root);

		const templates = await store.list();
		expect(templates).toEqual([]);
	});

	test("remove deletes template directory", async () => {
		const root = await mkdtemp(join(tmpdir(), "sandctl-template-store-test-"));
		const store = new TemplateStore(root);

		await store.add("Ghost");
		expect(await store.exists("Ghost")).toBe(true);

		await store.remove("Ghost");
		expect(await store.exists("Ghost")).toBe(false);
	});

	test("remove throws TemplateNotFoundError for missing template", async () => {
		const root = await mkdtemp(join(tmpdir(), "sandctl-template-store-test-"));
		const store = new TemplateStore(root);

		await expect(store.remove("Nope")).rejects.toBeInstanceOf(
			TemplateNotFoundError,
		);
	});

	test("exists returns true for existing template, false otherwise", async () => {
		const root = await mkdtemp(join(tmpdir(), "sandctl-template-store-test-"));
		const store = new TemplateStore(root);

		expect(await store.exists("Ghost")).toBe(false);
		await store.add("Ghost");
		expect(await store.exists("Ghost")).toBe(true);
	});

	test("getInitScriptPath returns path to init.sh", async () => {
		const root = await mkdtemp(join(tmpdir(), "sandctl-template-store-test-"));
		const store = new TemplateStore(root);

		await store.add("Ghost");
		const scriptPath = await store.getInitScriptPath("Ghost");
		expect(scriptPath).toBe(join(root, "ghost", "init.sh"));
	});

	test("getInitScriptPath throws for missing template", async () => {
		const root = await mkdtemp(join(tmpdir(), "sandctl-template-store-test-"));
		const store = new TemplateStore(root);

		await expect(store.getInitScriptPath("Nope")).rejects.toBeInstanceOf(
			TemplateNotFoundError,
		);
	});
});
