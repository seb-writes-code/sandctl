import {
	mkdir,
	readdir,
	readFile,
	rm,
	stat,
	writeFile,
} from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { parse, stringify } from "yaml";
import { normalizeTemplateName } from "@/template/normalize";
import type {
	TemplateConfig,
	TemplateInitScript,
	TemplateStoreLike,
} from "@/template/types";

const CONFIG_NAME = "config.yaml";
const INIT_SCRIPT_NAME = "init.sh";

const INIT_SCRIPT_TEMPLATE = `#!/bin/bash
# Init script for template: %s
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

echo "Template '%s' initialized successfully"
`;

function generateInitScript(originalName: string): string {
	return INIT_SCRIPT_TEMPLATE.replaceAll("%s", originalName);
}

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

export class TemplateStore implements TemplateStoreLike {
	constructor(private readonly basePath = defaultTemplatesPath()) {}

	private configPath(normalizedName: string): string {
		return join(this.basePath, normalizedName, CONFIG_NAME);
	}

	private scriptPath(normalizedName: string): string {
		return join(this.basePath, normalizedName, INIT_SCRIPT_NAME);
	}

	private templateDir(normalizedName: string): string {
		return join(this.basePath, normalizedName);
	}

	async add(name: string): Promise<TemplateConfig> {
		if (!name || !name.trim()) {
			throw new Error("template name is required");
		}

		const normalized = normalizeTemplateName(name);
		if (!normalized) {
			throw new Error("template name is required");
		}

		if (await this.exists(name)) {
			throw new TemplateAlreadyExistsError(name);
		}

		const config: TemplateConfig = {
			template: normalized,
			original_name: name,
			created_at: new Date().toISOString(),
		};

		const dir = this.templateDir(normalized);
		await mkdir(dir, { recursive: true, mode: 0o700 });
		await writeFile(this.configPath(normalized), stringify(config), {
			mode: 0o600,
		});
		await writeFile(this.scriptPath(normalized), generateInitScript(name), {
			mode: 0o700,
		});

		return config;
	}

	async get(name: string): Promise<TemplateConfig> {
		const normalized = normalizeTemplateName(name);
		if (!normalized) {
			throw new TemplateNotFoundError(name);
		}
		const configPath = this.configPath(normalized);
		try {
			const content = await readFile(configPath, "utf8");
			return parse(content) as TemplateConfig;
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "ENOENT") {
				throw new TemplateNotFoundError(name);
			}
			throw error;
		}
	}

	async list(): Promise<TemplateConfig[]> {
		let entries: string[];
		try {
			entries = await readdir(this.basePath);
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "ENOENT") {
				return [];
			}
			throw error;
		}

		const templates: TemplateConfig[] = [];
		for (const entry of entries) {
			try {
				const directory = this.templateDir(entry);
				const info = await stat(directory);
				if (!info.isDirectory()) {
					continue;
				}

				const configContent = await readFile(this.configPath(entry), "utf8");
				templates.push(parse(configContent) as TemplateConfig);
			} catch {}
		}

		return templates;
	}

	async remove(name: string): Promise<void> {
		const normalized = normalizeTemplateName(name);
		if (!normalized || !(await this.exists(name))) {
			throw new TemplateNotFoundError(name);
		}

		await rm(this.templateDir(normalized), { recursive: true, force: false });
	}

	async exists(name: string): Promise<boolean> {
		const normalized = normalizeTemplateName(name);
		if (!normalized) {
			return false;
		}
		try {
			await stat(this.configPath(normalized));
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
		const scriptPath = this.scriptPath(normalized);

		try {
			const script = await readFile(scriptPath, "utf8");
			return {
				name,
				normalized,
				script,
			};
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
		const scriptPath = this.scriptPath(normalized);
		try {
			await stat(scriptPath);
			return scriptPath;
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "ENOENT") {
				throw new TemplateNotFoundError(name);
			}
			throw error;
		}
	}
}
