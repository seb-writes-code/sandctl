import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { z } from "zod";
import type { Session, SessionStatus } from "./types.js";

const sessionSchema = z.object({
  id: z.string(),
  provider: z.string(),
  provider_id: z.string().optional(),
  status: z.enum(["provisioning", "running", "stopped", "failed", "destroyed"]),
  ip_address: z.string().optional(),
  created_at: z.string()
});

const storeSchema = z.object({
  sessions: z.array(sessionSchema).default([])
});

export class SessionStore {
  constructor(private readonly path: string = SessionStore.defaultPath()) {}

  static defaultPath(): string {
    return join(homedir(), ".sandctl", "sessions.json");
  }

  normalizeName(name: string): string {
    return name.trim().toLowerCase();
  }

  list(): Session[] {
    return this.load().sessions;
  }

  get(id: string): Session | undefined {
    const normalized = this.normalizeName(id);
    return this.list().find((s) => this.normalizeName(s.id) === normalized);
  }

  add(session: Session): void {
    const data = this.load();
    const id = this.normalizeName(session.id);

    if (data.sessions.some((s) => this.normalizeName(s.id) === id)) {
      throw new Error(`session with name '${id}' already exists`);
    }

    data.sessions.push({ ...session, id });
    this.save(data);
  }

  remove(id: string): void {
    const normalized = this.normalizeName(id);
    const data = this.load();
    const next = data.sessions.filter((s) => this.normalizeName(s.id) !== normalized);

    if (next.length === data.sessions.length) {
      throw new Error(`session '${id}' not found`);
    }

    this.save({ sessions: next });
  }

  updateStatus(id: string, status: SessionStatus): void {
    const normalized = this.normalizeName(id);
    const data = this.load();
    const target = data.sessions.find((s) => this.normalizeName(s.id) === normalized);

    if (!target) {
      throw new Error(`session '${id}' not found`);
    }

    target.status = status;
    this.save(data);
  }

  private load(): { sessions: Session[] } {
    if (!existsSync(this.path)) {
      return { sessions: [] };
    }

    const raw = JSON.parse(readFileSync(this.path, "utf8"));
    return storeSchema.parse(raw);
  }

  private save(data: { sessions: Session[] }): void {
    mkdirSync(dirname(this.path), { recursive: true, mode: 0o700 });
    writeFileSync(this.path, JSON.stringify(data, null, 2), { mode: 0o600 });
    chmodSync(this.path, 0o600);
  }
}
