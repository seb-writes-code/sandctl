#!/usr/bin/env bun
import { Command } from "commander";
import { registerVersionCommand } from "./cli/commands/version.js";
import { registerInitCommand } from "./cli/commands/init.js";
import { registerListCommand } from "./cli/commands/list.js";
import { registerNewCommand } from "./cli/commands/new.js";
import { registerDestroyCommand } from "./cli/commands/destroy.js";

const program = new Command();

program
  .name("sandctl")
  .description("Manage sandboxed AI web development agents")
  .option("--config <path>", "config file path")
  .option("-v, --verbose", "enable verbose output", false);

registerVersionCommand(program);
registerInitCommand(program);
registerListCommand(program);
registerNewCommand(program);
registerDestroyCommand(program);

await program.parseAsync(process.argv);
