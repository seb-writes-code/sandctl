# Implementation Plan: Rewrite `sandctl` from Go to TypeScript (Bun)

## 1) Goals and Non-Goals

### Goals
- Deliver a Bun-based TypeScript CLI that is functionally equivalent to the current Go CLI.
- Preserve existing command UX (`init`, `new`, `list`, `console`, `exec`, `destroy`, `template`, `version`) and flag semantics.
- Keep existing config/session file locations and permissions compatible with current users.
- Maintain provider abstraction so current Hetzner support and future providers remain pluggable.

### Non-Goals
- Changing core product workflows during the initial rewrite.
- Introducing breaking config/schema changes in phase 1.
- Replacing infrastructure/provider APIs.

---

## 2) Current-State Capability Inventory (Parity Checklist)

Use this as the migration source-of-truth before coding:

1. **CLI surface area and subcommands**
   - Root/global flags (`--config`, `--verbose`) and command tree.
2. **Configuration system**
   - YAML config file (`~/.sandctl/config`), legacy detection, provider settings, SSH key modes, git settings, github token.
3. **Session persistence**
   - JSON store (`~/.sandctl/sessions.json`), case-insensitive lookups, status lifecycle.
4. **Provider abstraction**
   - Provider interface (`Create/Get/Delete/List/WaitReady`) and provider registry.
5. **Hetzner provider implementation**
   - VM lifecycle, SSH key management, cloud-init/user-data wiring.
6. **SSH execution and console**
   - Non-interactive command execution + interactive console behavior.
7. **Template management commands**
   - Add/list/show/edit/remove + template filesystem layout.
8. **Tests**
   - Unit and e2e behavior currently covered in Go tests.

Output artifact: a parity matrix (feature, Go behavior, TS status, tests, notes).

---

## 3) Target Architecture (TypeScript + Bun)

## 3.1 Runtime and Tooling
- Runtime: **Bun (latest stable)**.
- Language: **TypeScript (strict mode)**.
- Package manager: **bun**.
- Build/distribution: `bun build` for a single executable-like JS bundle + optional native packaging later.

## 3.2 Proposed Project Structure

```text
sandctl-ts/
  src/
    cli/
      index.ts            # entrypoint
      commands/
    core/
      config/
      session/
      provider/
      template/
      ssh/
      ui/
    providers/
      hetzner/
    shared/
      types/
      errors/
      utils/
  test/
    unit/
    integration/
    e2e/
```

## 3.3 Key Libraries (suggested)
- CLI framework: `commander` or `cac` (prefer `commander` for mature subcommand handling).
- YAML: `yaml`.
- Validation: `zod` (runtime schema validation for config/session data).
- SSH: `ssh2` (exec + shell/pty); fallback wrapper around OpenSSH where needed.
- HTTP: native `fetch` in Bun.
- Testing: Bun test runner (`bun test`) + lightweight integration harness.

---

## 4) Migration Strategy

## 4.1 Recommended Approach: Strangler Rewrite
- Build TypeScript CLI side-by-side while Go CLI remains source-of-truth.
- Migrate one bounded module at a time with parity tests.
- Switch default binary only after parity matrix is green.

## 4.2 Order of Implementation
1. Foundations (tooling, types, error model, logging)
2. Config + session store
3. Provider abstraction + Hetzner client
4. Core commands (`init`, `new`, `list`, `destroy`, `version`)
5. SSH features (`exec`, `console`)
6. Template commands
7. E2E parity and release hardening

---

## 5) Detailed Work Plan by Phase

## Phase 0: Discovery & Spec Freeze (2-3 days)
- Enumerate all commands/flags/options and output formats from Go implementation.
- Capture file formats, defaults, and permission requirements (0600/0700 cases).
- Produce migration parity matrix and acceptance criteria.

Deliverables:
- `docs/migration/parity-matrix.md`
- `docs/migration/behavior-baseline.md`

## Phase 1: Bun/TS Scaffold (1-2 days)
- Initialize Bun project with strict TypeScript, linting, formatting, and test setup.
- Create module boundaries (`core`, `providers`, `cli`, `shared`).
- Implement centralized error taxonomy and verbose logging utility.

Deliverables:
- Initial runnable `sandctl` command with `version`.
- CI job for `bun test` and `bun run typecheck`.

## Phase 2: Config + Session Port (3-4 days)
- Port config load/save/validation/legacy detection.
- Preserve backward-compatible config field names and file location.
- Port session store behaviors:
  - case-insensitive IDs
  - add/update/remove/list/get/listActive
  - secure file permission handling
- Write unit tests mirroring Go edge cases.

Deliverables:
- `core/config` and `core/session` complete with tests.

## Phase 3: Provider Framework + Hetzner (4-6 days)
- Implement provider interface/types in TS.
- Port provider registry and typed provider config resolution.
- Implement Hetzner API client:
  - create/get/delete/list server
  - wait-ready with polling/backoff + timeout
  - ssh-key ensure logic and id caching
- Add contract tests with API response fixtures/mocks.

Deliverables:
- End-to-end provider lifecycle tests against mocked Hetzner endpoints.

## Phase 4: Core Command Port (4-5 days)
- Port commands: `init`, `new`, `list`, `destroy`, `version`.
- Replicate UX details:
  - prompts
  - progress messaging
  - table/list rendering
  - error messages and exit codes
- Add integration tests for command flows using temp HOME dirs.

Deliverables:
- Feature parity for non-SSH command set.

## Phase 5: SSH Command Port (4-6 days)
- Port `exec` command (remote command execution, output piping, exit status propagation).
- Port `console` command:
  - TTY detection
  - interactive shell
  - resize/signal handling where Bun allows
- Validate behavior in Linux/macOS terminals.

Deliverables:
- Integration tests for `exec`; smoke/e2e tests for `console`.

## Phase 6: Template Command Port (3-4 days)
- Port template CRUD commands and local storage layout.
- Validate script handling and path normalization.
- Add regression tests for template workflows.

Deliverables:
- Full command parity across `template` subcommands.

## Phase 7: Hardening, Cutover, and Release (3-5 days)
- Run full parity matrix and close gaps.
- Benchmark startup time and command latency vs Go baseline.
- Add migration notes and user-facing release docs.
- Cut first TS/Bun release candidate.

Deliverables:
- `vNext-rc1` and rollback plan.

---

## 6) Compatibility Requirements

- Config path stays `~/.sandctl/config`.
- Session store stays `~/.sandctl/sessions.json`.
- Preserve existing YAML/JSON schemas for zero-migration rollout.
- Preserve command names, flags, and most output text (exact where scripts may parse output).
- Keep exit code contract stable for automation users.

---

## 7) Test Strategy

## 7.1 Test Layers
- **Unit**: config/session/provider logic and pure helpers.
- **Integration**: CLI command execution with fixture HOME directories.
- **Contract**: provider API compatibility using mocked HTTP fixtures.
- **E2E**: high-value user journeys (`init -> new -> list -> exec/console -> destroy`).

## 7.2 Parity Gates
- No phase can complete unless mapped Go behaviors are tested in TS.
- Green parity matrix required before binary cutover.
- Add snapshot tests for CLI help text and selected outputs.

---

## 8) Risks and Mitigations

1. **Interactive SSH/PTY differences in Bun**
   - Mitigation: spike early (Phase 1/2) and keep fallback adapter to system `ssh`.
2. **Behavior drift in error messages/exit codes**
   - Mitigation: golden tests from Go baseline.
3. **Config compatibility regressions**
   - Mitigation: schema tests using real config samples from current versions.
4. **Provider lifecycle edge cases**
   - Mitigation: exhaustive mocked API states + timeout/retry tests.

---

## 9) Rollout Plan

1. Ship preview binary as `sandctl-ts` first.
2. Ask internal users to run both CLIs on non-production sandboxes.
3. Collect parity bugs for one stabilization sprint.
4. Promote TS binary to default `sandctl` once parity matrix is complete.
5. Keep Go CLI rollback path available for at least one minor release.

---

## 10) Milestones and Timeline (Example)

- Week 1: Phases 0-2 complete
- Week 2: Phase 3 complete
- Week 3: Phases 4-5 complete
- Week 4: Phases 6-7 complete + RC

Total estimate: **3-5 weeks** depending on SSH complexity and provider integration testing depth.

---

## 11) Definition of Done

- All existing user-facing commands available in TypeScript/Bun.
- Parity matrix fully green (or approved deltas documented).
- CI passes (`typecheck`, `unit`, `integration`, `e2e`).
- Release notes and migration/rollback docs published.
- TS CLI is the default supported implementation.

---

## 12) Discrete Execution Checklist (with status)

Use this checklist as the day-to-day tracker. Mark items complete only when code + tests for that item are merged.

### Phase 0 — Discovery & Spec Freeze
- [ ] Create `docs/migration/parity-matrix.md` and map each Go command/flag/output behavior.
- [ ] Create `docs/migration/behavior-baseline.md` with golden CLI examples from Go.
- [ ] Record config/session schema compatibility notes and migration constraints.

### Phase 1 — Bun/TS Scaffold
- [x] Create `sandctl-ts/` project scaffold with Bun scripts and TS config.
- [x] Install and lock key dependencies (`commander`, `yaml`, `zod`, `typescript`, `bun-types`).
- [x] Add runnable entrypoint and wire initial command registration.
- [ ] Add centralized logger/error taxonomy module.
- [ ] Add CI workflow job for `bun test` and `bun run typecheck`.

### Phase 2 — Config + Session Port
- [x] Implement config load/save at `~/.sandctl/config` with YAML parsing + validation.
- [x] Enforce secure config file permissions (`0600`) and parent directory creation.
- [ ] Implement legacy config detection + migration messaging parity with Go.
- [x] Implement JSON session store at `~/.sandctl/sessions.json`.
- [x] Implement case-insensitive session lookup/add/remove/update behavior.
- [ ] Implement remaining store parity methods (`listActive`, `updateSession`, `getUsedNames`) where missing.
- [x] Add unit tests for config round-trip and case-insensitive session behavior.
- [ ] Expand unit tests to cover malformed files, permission edges, and not-found error contracts.

### Phase 3 — Provider Framework + Hetzner
- [ ] Define provider interfaces/types equivalent to Go contracts (`Create/Get/Delete/List/WaitReady`).
- [ ] Implement provider registry and provider selection from config/session context.
- [ ] Implement Hetzner API client + server lifecycle methods.
- [ ] Implement SSH key ensure/caching behavior for Hetzner.
- [ ] Add contract tests with mocked Hetzner responses.

### Phase 4 — Core Command Port
- [x] Port preview versions of `init`, `new`, `list`, `destroy`, `version` commands.
- [ ] Reach parity for command UX (prompts/progress/tables/messages/exit codes).
- [ ] Add integration tests for command workflows using temp HOME directories.

### Phase 5 — SSH Commands
- [ ] Port `exec` command with remote exit-code propagation.
- [ ] Port `console` command with TTY + resize/signal handling.
- [ ] Add integration/smoke tests for SSH command flows.

### Phase 6 — Template Commands
- [ ] Port `template` command group (`add/list/show/edit/remove`).
- [ ] Match template on-disk layout and script behavior.
- [ ] Add regression tests for template workflows.

### Phase 7 — Hardening & Cutover
- [ ] Complete parity matrix and document approved behavioral deltas.
- [ ] Benchmark startup/command latency against Go baseline.
- [ ] Publish migration notes, release notes, and rollback process.
- [ ] Ship `sandctl-ts` preview release candidate and stabilization pass.
- [ ] Promote TS/Bun implementation to default `sandctl` after parity gates are green.
