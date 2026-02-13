import type { Command } from "commander";
import { getStore } from "../context.js";

export function registerListCommand(program: Command): void {
  program
    .command("list")
    .description("List active sessions")
    .action(() => {
      const sessions = getStore().list();
      if (sessions.length === 0) {
        console.log("No sessions found.");
        return;
      }

      for (const s of sessions) {
        console.log(`${s.id}\t${s.status}\t${s.provider}\t${s.created_at}`);
      }
    });
}
