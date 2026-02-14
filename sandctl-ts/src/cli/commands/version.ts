import type { Command } from "commander";

const VERSION = "0.1.0-ts-preview";

export function registerVersionCommand(program: Command): void {
  program
    .command("version")
    .description("Show version information")
    .action(() => {
      console.log(`sandctl version ${VERSION}`);
    });
}
