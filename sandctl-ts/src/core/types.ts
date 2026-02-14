export type ProviderName = "hetzner" | string;

export interface ProviderConfig {
  token: string;
  region?: string | undefined;
  server_type?: string | undefined;
  image?: string | undefined;
  ssh_key_id?: number | undefined;
}

export interface Config {
  default_provider: ProviderName;
  ssh_public_key?: string | undefined;
  providers: Record<string, ProviderConfig>;
  ssh_key_source?: "file" | "agent" | undefined;
  ssh_public_key_inline?: string | undefined;
  ssh_key_fingerprint?: string | undefined;
  git_config_path?: string | undefined;
  git_user_name?: string | undefined;
  git_user_email?: string | undefined;
  github_token?: string | undefined;
}

export type SessionStatus =
  | "provisioning"
  | "running"
  | "stopped"
  | "failed"
  | "destroyed";

export interface Session {
  id: string;
  provider: string;
  provider_id?: string | undefined;
  status: SessionStatus;
  ip_address?: string | undefined;
  created_at: string;
}
