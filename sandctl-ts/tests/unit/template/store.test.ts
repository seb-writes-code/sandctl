import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
	TemplateAlreadyExistsError,
	TemplateNotFoundError,
	TemplateStore,
} from "@/template/store";

describe("template/store", () => {
	test("adds and lists templates", async () => {
		const root = await mkdtemp(join(tmpdir(), "sandctl-template-store-test-"));
		const store = new TemplateStore(root);

		const created = await store.add("My API");
		expect(created.template).toBe("my-api");
		expect(created.original_name).toBe("My API");

		const listed = await store.list();
		expect(listed).toHaveLength(1);
		expect(listed[0]?.template).toBe("my-api");
	});

	test("throws TemplateAlreadyExistsError when adding duplicate", async () => {
		const root = await mkdtemp(join(tmpdir(), "sandctl-template-store-test-"));
		const store = new TemplateStore(root);
		await store.add("Ghost");

		await expect(store.add("Ghost")).rejects.toBeInstanceOf(
			TemplateAlreadyExistsError,
		);
	});

	test("loads init script from normalized template directory", async () => {
		const root = await mkdtemp(join(tmpdir(), "sandctl-template-store-test-"));
		const templateDir = join(root, "my-api");
		await mkdir(templateDir, { recursive: true });
		await writeFile(join(templateDir, "init.sh"), "#!/bin/sh\necho hi\n");
		await writeFile(
			join(templateDir, "config.yaml"),
			"template: my-api\noriginal_name: My API\ncreated_at: 2026-01-01T00:00:00Z\n",
		);

		const store = new TemplateStore(root);
		const loaded = await store.getInitScript("My API");

		expect(loaded).toEqual({
			name: "My API",
			normalized: "my-api",
			script: "#!/bin/sh\necho hi\n",
		});
	});

	test("removes template directory", async () => {
		const root = await mkdtemp(join(tmpdir(), "sandctl-template-store-test-"));
		const store = new TemplateStore(root);
		await store.add("Delete Me");

		await store.remove("Delete Me");
		expect(await store.exists("Delete Me")).toBe(false);
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
});
