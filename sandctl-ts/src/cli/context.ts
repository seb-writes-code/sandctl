import { resolve } from "node:path";
import { defaultConfigPath } from "../core/config.js";
import { SessionStore } from "../core/session-store.js";

export function getConfigPath(programOpts: { config?: string }): string {
  return programOpts.config ? resolve(programOpts.config) : defaultConfigPath();
}

export function getStore(): SessionStore {
  return new SessionStore();
}
