import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import YAML from "yaml";
import { z } from "zod";
import type { Config } from "./types.js";

const providerConfigSchema = z.object({
  token: z.string().default(""),
  region: z.string().optional(),
  server_type: z.string().optional(),
  image: z.string().optional(),
  ssh_key_id: z.number().optional()
});

const configSchema = z.object({
  default_provider: z.string().default("hetzner"),
  ssh_public_key: z.string().optional(),
  providers: z.record(z.string(), providerConfigSchema).default({}),
  ssh_key_source: z.enum(["file", "agent"]).optional(),
  ssh_public_key_inline: z.string().optional(),
  ssh_key_fingerprint: z.string().optional(),
  git_config_path: z.string().optional(),
  git_user_name: z.string().optional(),
  git_user_email: z.string().optional(),
  github_token: z.string().optional()
});

export function defaultConfigPath(): string {
  return join(homedir(), ".sandctl", "config");
}

export function loadConfig(path = defaultConfigPath()): Config {
  if (!existsSync(path)) {
    return { default_provider: "hetzner", providers: {} };
  }

  const raw = YAML.parse(readFileSync(path, "utf8")) ?? {};
  return configSchema.parse(raw) as Config;
}

export function saveConfig(config: Config, path = defaultConfigPath()): void {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  writeFileSync(path, YAML.stringify(config), { mode: 0o600 });
  chmodSync(path, 0o600);
}
