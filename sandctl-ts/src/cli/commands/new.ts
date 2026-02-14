import { randomUUID } from "node:crypto";
import type { Command } from "commander";
import { getStore } from "../context.js";

export function registerNewCommand(program: Command): void {
  program
    .command("new")
    .description("Create a new sandboxed agent session")
    .requiredOption("--prompt <text>", "task prompt")
    .option("--name <name>", "session name")
    .option("--provider <provider>", "provider", "hetzner")
    .action((opts: { prompt: string; name?: string; provider: string }) => {
      const id = opts.name ?? `session-${randomUUID().slice(0, 8)}`;
      getStore().add({
        id,
        provider: opts.provider,
        status: "provisioning",
        created_at: new Date().toISOString()
      });

      console.log(`Created session ${id}`);
      console.log("Note: VM provisioning is pending provider implementation.");
    });
}
