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

import YAML from "yaml";

import { normalizeTemplateName } from "@/template/normalize";
import type {
	TemplateConfig,
	TemplateInitScript,
	TemplateStoreLike,
} from "@/template/types";

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
		await writeFile(
			join(templateDir, INIT_SCRIPT_NAME),
			generateInitScript(name),
			{ mode: 0o700 },
		);

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
		let entries: { isDirectory(): boolean; name: string }[];
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
				const data = await readFile(
					join(this.basePath, entry.name, CONFIG_NAME),
					"utf8",
				);
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
