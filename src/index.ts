#!/usr/bin/env bun
import { Command } from "commander";
import { versionCommand } from "./commands/version.js";

const program = new Command()
  .name("sandctl")
  .description("Manage sandboxed AI web development agents")
  .option("--config <path>", "Config file path", "~/.sandctl/config")
  .option("-v, --verbose", "Enable verbose debug output");

program.addCommand(versionCommand);

program.parse();
