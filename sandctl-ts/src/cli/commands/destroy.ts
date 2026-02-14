import type { Command } from "commander";
import { getStore } from "../context.js";

export function registerDestroyCommand(program: Command): void {
  program
    .command("destroy <sessionId>")
    .description("Terminate and remove a session")
    .action((sessionId: string) => {
      getStore().remove(sessionId);
      console.log(`Destroyed session ${sessionId}`);
      console.log("Note: VM deletion is pending provider implementation.");
    });
}
