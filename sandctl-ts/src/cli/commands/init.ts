import type { Command } from "commander";
import { getConfigPath } from "../context.js";
import { loadConfig, saveConfig } from "../../core/config.js";

export function registerInitCommand(program: Command): void {
  program
    .command("init")
    .description("Initialize or update sandctl configuration")
    .option("--provider <provider>", "default provider", "hetzner")
    .option("--token <token>", "provider API token")
    .action((opts: { provider: string; token?: string }) => {
      const rootOpts = program.opts<{ config?: string }>();
      const configPath = getConfigPath(rootOpts);
      const config = loadConfig(configPath);

      const provider = opts.provider;
      config.default_provider = provider;
      config.providers[provider] = {
        token: opts.token ?? config.providers[provider]?.token ?? ""
      };

      saveConfig(config, configPath);
      console.log(`Saved configuration to ${configPath}`);
    });
}
