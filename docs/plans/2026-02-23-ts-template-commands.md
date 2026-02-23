# TypeScript Template Commands Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Port all 5 Go template management subcommands (add, list, show, edit, remove) to sandctl-ts with full parity.

**Architecture:** Extend the existing `TemplateStore` with CRUD methods and `config.yaml` support. Add 5 new command files following the flat `src/commands/` pattern with `runX()` + `registerXCommand()` DI convention. Shared editor detection in `src/utils/editor.ts`.

**Tech Stack:** TypeScript, Bun, Commander.js, `@inquirer/prompts`, `yaml`, `luxon`, `bun:test`

---

### Task 1: Extend Template Types

**Files:**
- Modify: `sandctl-ts/src/template/types.ts`

**Step 1: Add TemplateConfig interface and expand TemplateStoreLike**

```typescript
// sandctl-ts/src/template/types.ts — full replacement
export interface TemplateInitScript {
	name: string;
	normalized: string;
	script: string;
}

export interface TemplateConfig {
	template: string;
	original_name: string;
	created_at: string;
	timeout?: string;
}

export interface TemplateStoreLike {
	getInitScript(name: string): Promise<TemplateInitScript>;
	add(name: string): Promise<TemplateConfig>;
	get(name: string): Promise<TemplateConfig>;
	list(): Promise<TemplateConfig[]>;
	remove(name: string): Promise<void>;
	exists(name: string): Promise<boolean>;
	getInitScriptPath(name: string): Promise<string>;
}
```

**Step 2: Verify no type errors**

Run: `cd sandctl-ts && npx tsc --noEmit 2>&1 | head -20`
Expected: May see errors in store.ts (expected — TemplateStore doesn't implement new methods yet). No errors in types.ts itself.

**Step 3: Commit**

```bash
git add sandctl-ts/src/template/types.ts
git commit -m "feat(ts): add TemplateConfig type and expand TemplateStoreLike"
```

---

### Task 2: Extend TemplateStore with CRUD Methods

**Files:**
- Modify: `sandctl-ts/src/template/store.ts`
- Modify: `sandctl-ts/tests/unit/template/store.test.ts`

**Step 1: Write failing tests for store.add()**

Add to `sandctl-ts/tests/unit/template/store.test.ts`:

```typescript
import { stat } from "node:fs/promises";
import { TemplateAlreadyExistsError, TemplateStore } from "@/template/store";

// ... existing tests ...

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
	await expect(store.add("Ghost")).rejects.toBeInstanceOf(TemplateAlreadyExistsError);
});

test("add throws for empty name", async () => {
	const root = await mkdtemp(join(tmpdir(), "sandctl-template-store-test-"));
	const store = new TemplateStore(root);

	await expect(store.add("")).rejects.toThrow("template name is required");
	await expect(store.add("!!!")).rejects.toThrow("template name is required");
});
```

**Step 2: Run tests to verify they fail**

Run: `cd sandctl-ts && bun test tests/unit/template/store.test.ts`
Expected: FAIL — `TemplateAlreadyExistsError` not exported, `store.add` not a function

**Step 3: Write failing tests for store.get(), list(), remove(), exists(), getInitScriptPath()**

Add to the same test file:

```typescript
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

	await expect(store.get("Nope")).rejects.toBeInstanceOf(TemplateNotFoundError);
});

test("list returns all templates sorted by created_at", async () => {
	const root = await mkdtemp(join(tmpdir(), "sandctl-template-store-test-"));
	const store = new TemplateStore(root);

	await store.add("Alpha");
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

	await expect(store.remove("Nope")).rejects.toBeInstanceOf(TemplateNotFoundError);
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

	await expect(store.getInitScriptPath("Nope")).rejects.toBeInstanceOf(TemplateNotFoundError);
});
```

**Step 4: Implement TemplateStore CRUD methods**

Replace `sandctl-ts/src/template/store.ts` with:

```typescript
import { chmod, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import YAML from "yaml";

import { normalizeTemplateName } from "@/template/normalize";
import type { TemplateConfig, TemplateInitScript, TemplateStoreLike } from "@/template/types";

const INIT_SCRIPT_NAME = "init.sh";
const CONFIG_NAME = "config.yaml";

export function defaultTemplatesPath(): string {
	return join(homedir(), ".sandctl", "templates");
}

export class TemplateNotFoundError extends Error {
	constructor(readonly template: string) {
		super(`template '${template}' not found`);
	}
}

export class TemplateAlreadyExistsError extends Error {
	constructor(readonly template: string) {
		super(`template '${template}' already exists`);
	}
}

function generateInitScript(originalName: string): string {
	return `#!/bin/bash
# Init script for template: ${originalName}
# This script runs on the sandbox VM after creation.
#
# Available environment variables:
#   SANDCTL_TEMPLATE_NAME       - Original template name
#   SANDCTL_TEMPLATE_NORMALIZED - Normalized template name (lowercase)
#
# Examples:
#   apt-get update && apt-get install -y nodejs npm
#   git clone https://github.com/your/repo.git /home/agent/project
#   cd /home/agent/project && npm install

set -e  # Exit on first error

echo "Template '${originalName}' initialized successfully"
`;
}

export class TemplateStore implements TemplateStoreLike {
	constructor(private readonly basePath = defaultTemplatesPath()) {}

	async add(name: string): Promise<TemplateConfig> {
		const normalized = normalizeTemplateName(name);
		if (!normalized) {
			throw new Error("template name is required");
		}

		const templateDir = join(this.basePath, normalized);
		const configPath = join(templateDir, CONFIG_NAME);

		// Check if already exists
		try {
			await stat(configPath);
			throw new TemplateAlreadyExistsError(name);
		} catch (error) {
			if (error instanceof TemplateAlreadyExistsError) throw error;
			// ENOENT is expected — template doesn't exist yet
		}

		const config: TemplateConfig = {
			template: normalized,
			original_name: name,
			created_at: new Date().toISOString(),
		};

		await mkdir(templateDir, { recursive: true });
		await writeFile(configPath, YAML.stringify(config), { mode: 0o600 });
		await writeFile(join(templateDir, INIT_SCRIPT_NAME), generateInitScript(name), { mode: 0o700 });

		return config;
	}

	async get(name: string): Promise<TemplateConfig> {
		const normalized = normalizeTemplateName(name);
		if (!normalized) {
			throw new TemplateNotFoundError(name);
		}

		const configPath = join(this.basePath, normalized, CONFIG_NAME);
		try {
			const data = await readFile(configPath, "utf8");
			return YAML.parse(data) as TemplateConfig;
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "ENOENT") {
				throw new TemplateNotFoundError(name);
			}
			throw error;
		}
	}

	async list(): Promise<TemplateConfig[]> {
		let entries: Awaited<ReturnType<typeof readdir>>;
		try {
			entries = await readdir(this.basePath, { withFileTypes: true });
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "ENOENT") {
				return [];
			}
			throw error;
		}

		const configs: TemplateConfig[] = [];
		for (const entry of entries) {
			if (!entry.isDirectory()) continue;
			try {
				const data = await readFile(join(this.basePath, entry.name, CONFIG_NAME), "utf8");
				configs.push(YAML.parse(data) as TemplateConfig);
			} catch {
				// Skip invalid entries
			}
		}

		configs.sort((a, b) => a.created_at.localeCompare(b.created_at));
		return configs;
	}

	async remove(name: string): Promise<void> {
		const normalized = normalizeTemplateName(name);
		if (!normalized) {
			throw new TemplateNotFoundError(name);
		}

		const templateDir = join(this.basePath, normalized);
		try {
			await stat(templateDir);
		} catch {
			throw new TemplateNotFoundError(name);
		}

		await rm(templateDir, { recursive: true });
	}

	async exists(name: string): Promise<boolean> {
		const normalized = normalizeTemplateName(name);
		if (!normalized) return false;

		try {
			await stat(join(this.basePath, normalized, CONFIG_NAME));
			return true;
		} catch {
			return false;
		}
	}

	async getInitScript(name: string): Promise<TemplateInitScript> {
		const normalized = normalizeTemplateName(name);
		if (!normalized) {
			throw new TemplateNotFoundError(name);
		}
		const scriptPath = join(this.basePath, normalized, INIT_SCRIPT_NAME);

		try {
			const script = await readFile(scriptPath, "utf8");
			return { name, normalized, script };
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "ENOENT") {
				throw new TemplateNotFoundError(name);
			}
			throw error;
		}
	}

	async getInitScriptPath(name: string): Promise<string> {
		const normalized = normalizeTemplateName(name);
		if (!normalized) {
			throw new TemplateNotFoundError(name);
		}

		const scriptPath = join(this.basePath, normalized, INIT_SCRIPT_NAME);
		try {
			await stat(scriptPath);
			return scriptPath;
		} catch {
			throw new TemplateNotFoundError(name);
		}
	}
}
```

**Step 5: Run tests to verify they pass**

Run: `cd sandctl-ts && bun test tests/unit/template/store.test.ts`
Expected: ALL PASS

**Step 6: Commit**

```bash
git add sandctl-ts/src/template/store.ts sandctl-ts/src/template/types.ts sandctl-ts/tests/unit/template/store.test.ts
git commit -m "feat(ts): extend TemplateStore with CRUD methods and config.yaml support"
```

---

### Task 3: Create Editor Detection Utility

**Files:**
- Create: `sandctl-ts/src/utils/editor.ts`

**Step 1: Implement editor detection**

```typescript
// sandctl-ts/src/utils/editor.ts
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
		return Promise.reject(new Error("no editor found. Set the EDITOR environment variable"));
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
```

**Step 2: Commit**

```bash
git add sandctl-ts/src/utils/editor.ts
git commit -m "feat(ts): add editor detection utility"
```

---

### Task 4: Implement `template add` Command

**Files:**
- Create: `sandctl-ts/src/commands/template-add.ts`
- Create: `sandctl-ts/tests/unit/commands/template-add.test.ts`

**Step 1: Write failing tests**

```typescript
// sandctl-ts/tests/unit/commands/template-add.test.ts
import { describe, expect, mock, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { TemplateAlreadyExistsError, TemplateStore } from "@/template/store";
import { runTemplateAdd } from "@/commands/template-add";

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
```

**Step 2: Run tests to verify they fail**

Run: `cd sandctl-ts && bun test tests/unit/commands/template-add.test.ts`
Expected: FAIL — module not found

**Step 3: Implement template-add command**

```typescript
// sandctl-ts/src/commands/template-add.ts
import { Command } from "commander";

import { TemplateAlreadyExistsError, TemplateStore } from "@/template/store";
import { openInEditor } from "@/utils/editor";

interface Dependencies {
	log: (message: string) => void;
	errLog: (message: string) => void;
	openEditor: (filePath: string) => Promise<void>;
}

const defaultDependencies: Dependencies = {
	log: (message: string) => console.log(message),
	errLog: (message: string) => console.error(message),
	openEditor,
};

export async function runTemplateAdd(
	name: string,
	store = new TemplateStore(),
	deps: Partial<Dependencies> = {},
): Promise<void> {
	const { log, errLog, openEditor: edit } = { ...defaultDependencies, ...deps };

	if (!name.trim()) {
		throw new Error("template name is required");
	}

	let config;
	try {
		config = await store.add(name);
	} catch (error) {
		if (error instanceof TemplateAlreadyExistsError) {
			errLog(`Error: Template '${name}' already exists. Use 'sandctl template edit ${name}' to modify it.`);
			return;
		}
		throw error;
	}

	const scriptPath = await store.getInitScriptPath(name);
	log(`Created template '${config.original_name}'`);
	log("Opening init script in editor...");

	try {
		await edit(scriptPath);
	} catch (error) {
		errLog(`Warning: ${error instanceof Error ? error.message : String(error)}`);
		errLog(`Edit your script at: ${scriptPath}`);
	}

	log("");
	log(`Template '${config.original_name}' is ready. Use 'sandctl new -T ${config.template}' to create a session.`);
}

export function registerTemplateAddCommand(): Command {
	return new Command("add")
		.description("Create a new template configuration")
		.argument("<name>", "Template name")
		.action(async (name: string) => {
			await runTemplateAdd(name);
		});
}
```

**Step 4: Run tests to verify they pass**

Run: `cd sandctl-ts && bun test tests/unit/commands/template-add.test.ts`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add sandctl-ts/src/commands/template-add.ts sandctl-ts/tests/unit/commands/template-add.test.ts
git commit -m "feat(ts): implement template add command"
```

---

### Task 5: Implement `template list` Command

**Files:**
- Create: `sandctl-ts/src/commands/template-list.ts`
- Create: `sandctl-ts/tests/unit/commands/template-list.test.ts`

**Step 1: Write failing tests**

```typescript
// sandctl-ts/tests/unit/commands/template-list.test.ts
import { describe, expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { TemplateStore } from "@/template/store";
import { runTemplateList } from "@/commands/template-list";

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

		expect(output.some((m) => m.includes("No templates configured"))).toBe(true);
	});
});
```

**Step 2: Run tests to verify they fail**

Run: `cd sandctl-ts && bun test tests/unit/commands/template-list.test.ts`
Expected: FAIL — module not found

**Step 3: Implement template-list command**

```typescript
// sandctl-ts/src/commands/template-list.ts
import { Command } from "commander";
import { DateTime } from "luxon";

import { TemplateStore } from "@/template/store";
import type { TemplateConfig } from "@/template/types";

interface Dependencies {
	log: (message: string) => void;
}

const defaultDependencies: Dependencies = {
	log: (message: string) => console.log(message),
};

function formatCreatedAt(iso: string): string {
	return DateTime.fromISO(iso).toLocal().toFormat("yyyy-MM-dd HH:mm:ss");
}

export async function runTemplateList(
	store = new TemplateStore(),
	deps: Partial<Dependencies> = {},
): Promise<void> {
	const { log } = { ...defaultDependencies, ...deps };

	const configs = await store.list();

	if (configs.length === 0) {
		log("No templates configured.");
		log("");
		log("Create one with: sandctl template add <name>");
		return;
	}

	log("NAME                 CREATED");
	for (const config of configs) {
		const cols = [
			config.original_name.padEnd(20),
			formatCreatedAt(config.created_at),
		];
		log(cols.join(" "));
	}
}

export function registerTemplateListCommand(): Command {
	return new Command("list")
		.description("List all configured templates")
		.action(async () => {
			await runTemplateList();
		});
}
```

**Step 4: Run tests to verify they pass**

Run: `cd sandctl-ts && bun test tests/unit/commands/template-list.test.ts`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add sandctl-ts/src/commands/template-list.ts sandctl-ts/tests/unit/commands/template-list.test.ts
git commit -m "feat(ts): implement template list command"
```

---

### Task 6: Implement `template show` Command

**Files:**
- Create: `sandctl-ts/src/commands/template-show.ts`
- Create: `sandctl-ts/tests/unit/commands/template-show.test.ts`

**Step 1: Write failing tests**

```typescript
// sandctl-ts/tests/unit/commands/template-show.test.ts
import { describe, expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { TemplateNotFoundError, TemplateStore } from "@/template/store";
import { runTemplateShow } from "@/commands/template-show";

describe("template show", () => {
	test("prints init script content to output", async () => {
		const root = await mkdtemp(join(tmpdir(), "sandctl-tpl-show-"));
		const store = new TemplateStore(root);
		await store.add("Ghost");

		const output: string[] = [];
		await runTemplateShow("Ghost", store, { write: (msg: string) => output.push(msg) });

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
```

**Step 2: Run tests to verify they fail**

Run: `cd sandctl-ts && bun test tests/unit/commands/template-show.test.ts`
Expected: FAIL

**Step 3: Implement template-show command**

```typescript
// sandctl-ts/src/commands/template-show.ts
import { Command } from "commander";

import { TemplateNotFoundError, TemplateStore } from "@/template/store";

interface Dependencies {
	write: (content: string) => void;
}

const defaultDependencies: Dependencies = {
	write: (content: string) => process.stdout.write(content),
};

export async function runTemplateShow(
	name: string,
	store = new TemplateStore(),
	deps: Partial<Dependencies> = {},
): Promise<void> {
	const { write } = { ...defaultDependencies, ...deps };

	try {
		const initScript = await store.getInitScript(name);
		write(initScript.script);
	} catch (error) {
		if (error instanceof TemplateNotFoundError) {
			throw new Error(`template '${name}' not found. Use 'sandctl template list' to see available templates`);
		}
		throw error;
	}
}

export function registerTemplateShowCommand(): Command {
	return new Command("show")
		.description("Display a template's init script")
		.argument("<name>", "Template name")
		.action(async (name: string) => {
			await runTemplateShow(name);
		});
}
```

**Step 4: Run tests to verify they pass**

Run: `cd sandctl-ts && bun test tests/unit/commands/template-show.test.ts`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add sandctl-ts/src/commands/template-show.ts sandctl-ts/tests/unit/commands/template-show.test.ts
git commit -m "feat(ts): implement template show command"
```

---

### Task 7: Implement `template edit` Command

**Files:**
- Create: `sandctl-ts/src/commands/template-edit.ts`
- Create: `sandctl-ts/tests/unit/commands/template-edit.test.ts`

**Step 1: Write failing tests**

```typescript
// sandctl-ts/tests/unit/commands/template-edit.test.ts
import { describe, expect, mock, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { TemplateStore } from "@/template/store";
import { runTemplateEdit } from "@/commands/template-edit";

describe("template edit", () => {
	test("opens editor for existing template", async () => {
		const root = await mkdtemp(join(tmpdir(), "sandctl-tpl-edit-"));
		const store = new TemplateStore(root);
		await store.add("Ghost");

		const openEditor = mock(async () => {});
		await runTemplateEdit("Ghost", store, { openEditor });

		expect(openEditor).toHaveBeenCalledTimes(1);
		const calledPath = openEditor.mock.calls[0][0] as string;
		expect(calledPath).toContain("ghost");
		expect(calledPath).toContain("init.sh");
	});

	test("throws for non-existent template", async () => {
		const root = await mkdtemp(join(tmpdir(), "sandctl-tpl-edit-"));
		const store = new TemplateStore(root);

		await expect(
			runTemplateEdit("Nope", store, { openEditor: async () => {} }),
		).rejects.toThrow(/not found/);
	});
});
```

**Step 2: Run tests to verify they fail**

Run: `cd sandctl-ts && bun test tests/unit/commands/template-edit.test.ts`
Expected: FAIL

**Step 3: Implement template-edit command**

```typescript
// sandctl-ts/src/commands/template-edit.ts
import { Command } from "commander";

import { TemplateNotFoundError, TemplateStore } from "@/template/store";
import { openInEditor } from "@/utils/editor";

interface Dependencies {
	openEditor: (filePath: string) => Promise<void>;
}

const defaultDependencies: Dependencies = {
	openEditor: openInEditor,
};

export async function runTemplateEdit(
	name: string,
	store = new TemplateStore(),
	deps: Partial<Dependencies> = {},
): Promise<void> {
	const { openEditor: edit } = { ...defaultDependencies, ...deps };

	let scriptPath: string;
	try {
		scriptPath = await store.getInitScriptPath(name);
	} catch (error) {
		if (error instanceof TemplateNotFoundError) {
			throw new Error(`template '${name}' not found. Use 'sandctl template list' to see available templates`);
		}
		throw error;
	}

	await edit(scriptPath);
}

export function registerTemplateEditCommand(): Command {
	return new Command("edit")
		.description("Edit a template's init script")
		.argument("<name>", "Template name")
		.action(async (name: string) => {
			await runTemplateEdit(name);
		});
}
```

**Step 4: Run tests to verify they pass**

Run: `cd sandctl-ts && bun test tests/unit/commands/template-edit.test.ts`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add sandctl-ts/src/commands/template-edit.ts sandctl-ts/tests/unit/commands/template-edit.test.ts
git commit -m "feat(ts): implement template edit command"
```

---

### Task 8: Implement `template remove` Command

**Files:**
- Create: `sandctl-ts/src/commands/template-remove.ts`
- Create: `sandctl-ts/tests/unit/commands/template-remove.test.ts`

**Step 1: Write failing tests**

```typescript
// sandctl-ts/tests/unit/commands/template-remove.test.ts
import { describe, expect, mock, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { TemplateStore } from "@/template/store";
import { runTemplateRemove } from "@/commands/template-remove";

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
```

**Step 2: Run tests to verify they fail**

Run: `cd sandctl-ts && bun test tests/unit/commands/template-remove.test.ts`
Expected: FAIL

**Step 3: Implement template-remove command**

```typescript
// sandctl-ts/src/commands/template-remove.ts
import { confirm as inquirerConfirm } from "@inquirer/prompts";
import { Command } from "commander";

import { TemplateNotFoundError, TemplateStore } from "@/template/store";

interface Dependencies {
	log: (message: string) => void;
	confirm: (message: string) => Promise<boolean>;
}

const defaultDependencies: Dependencies = {
	log: (message: string) => console.log(message),
	confirm: (message: string) => inquirerConfirm({ message, default: false }),
};

export async function runTemplateRemove(
	name: string,
	options: { force: boolean },
	store = new TemplateStore(),
	deps: Partial<Dependencies> = {},
): Promise<void> {
	const { log, confirm: askConfirm } = { ...defaultDependencies, ...deps };

	if (!(await store.exists(name))) {
		throw new Error(`template '${name}' not found. Use 'sandctl template list' to see available templates`);
	}

	if (!options.force) {
		const accepted = await askConfirm(`Delete template '${name}'?`);
		if (!accepted) {
			log("Canceled.");
			return;
		}
	}

	try {
		await store.remove(name);
	} catch (error) {
		if (error instanceof TemplateNotFoundError) {
			throw new Error(`template '${name}' not found`);
		}
		throw error;
	}

	log(`Template '${name}' deleted.`);
}

export function registerTemplateRemoveCommand(): Command {
	return new Command("remove")
		.description("Delete a template")
		.argument("<name>", "Template name")
		.option("-f, --force", "Skip confirmation prompt", false)
		.action(async (name: string, options: { force: boolean }) => {
			await runTemplateRemove(name, options);
		});
}
```

**Step 4: Run tests to verify they pass**

Run: `cd sandctl-ts && bun test tests/unit/commands/template-remove.test.ts`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add sandctl-ts/src/commands/template-remove.ts sandctl-ts/tests/unit/commands/template-remove.test.ts
git commit -m "feat(ts): implement template remove command"
```

---

### Task 9: Create Parent `template` Command and Register in CLI

**Files:**
- Create: `sandctl-ts/src/commands/template.ts`
- Modify: `sandctl-ts/src/index.ts`

**Step 1: Create parent template command**

```typescript
// sandctl-ts/src/commands/template.ts
import { Command } from "commander";

import { registerTemplateAddCommand } from "@/commands/template-add";
import { registerTemplateEditCommand } from "@/commands/template-edit";
import { registerTemplateListCommand } from "@/commands/template-list";
import { registerTemplateRemoveCommand } from "@/commands/template-remove";
import { registerTemplateShowCommand } from "@/commands/template-show";

export function registerTemplateCommand(): Command {
	const cmd = new Command("template").description(
		"Manage template configurations",
	);

	cmd.addCommand(registerTemplateAddCommand());
	cmd.addCommand(registerTemplateListCommand());
	cmd.addCommand(registerTemplateShowCommand());
	cmd.addCommand(registerTemplateEditCommand());
	cmd.addCommand(registerTemplateRemoveCommand());

	return cmd;
}
```

**Step 2: Register in index.ts**

Add to `sandctl-ts/src/index.ts`:
- Import: `import { registerTemplateCommand } from "@/commands/template";`
- Registration: `program.addCommand(registerTemplateCommand());`

The modified `index.ts` should have the import after the existing imports and the addCommand after the existing addCommand calls:

```typescript
// After: import { registerDestroyCommand } from "@/commands/destroy";
import { registerTemplateCommand } from "@/commands/template";

// After: program.addCommand(registerDestroyCommand());
program.addCommand(registerTemplateCommand());
```

**Step 3: Verify type checking passes**

Run: `cd sandctl-ts && npx tsc --noEmit`
Expected: No errors

**Step 4: Verify all tests pass**

Run: `cd sandctl-ts && bun test`
Expected: ALL PASS

**Step 5: Verify lint passes**

Run: `cd sandctl-ts && bun run lint`
Expected: No errors (may need minor formatting fixes)

**Step 6: Commit**

```bash
git add sandctl-ts/src/commands/template.ts sandctl-ts/src/index.ts
git commit -m "feat(ts): register template parent command with all subcommands"
```

---

### Task 10: Run Full Test Suite and Fix Any Issues

**Step 1: Run all unit tests**

Run: `cd sandctl-ts && bun test tests/unit/`
Expected: ALL PASS

**Step 2: Run lint and format**

Run: `cd sandctl-ts && bun run lint`
Expected: No errors. If there are formatting issues, run `bun run fmt` and commit.

**Step 3: Run build**

Run: `cd sandctl-ts && bun run build`
Expected: Build succeeds

**Step 4: Verify CLI help output**

Run: `cd sandctl-ts && bun src/index.ts template --help`
Expected: Shows template subcommands (add, list, show, edit, remove)

Run: `cd sandctl-ts && bun src/index.ts template add --help`
Expected: Shows add command usage

**Step 5: Final commit if any fixes were needed**

```bash
git add -A sandctl-ts/
git commit -m "fix(ts): address lint and build issues in template commands"
```
