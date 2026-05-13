# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

getlark CLI (`getlark`, published as `@getlark/cli`) — a TypeScript CLI tool for managing workflows on the getlark testing platform. Built with Commander.js, uses Node.js native fetch for API calls.

## Commands

- `npm run build` — compile TypeScript to `dist/`
- `npm run dev` — run CLI directly via tsx (no build needed)
- `npm run typecheck` — type-check without emitting
- `npm run start` — run from built `dist/`

No test runner or linter is configured.

## Architecture

**Entry point:** `src/index.ts` — initializes Commander program, registers all command modules, sets up global options (`--api-key`, `--api-url`, `--profile`). Reads version from `package.json` at runtime via `import.meta.url`.

**Config:** `src/config.ts` — resolves config from CLI options, env vars, and the active profile in `~/.getlark/config.json`. Precedence: `--api-key` flag → `GETLARK_API_KEY` → profile file. Legacy `LARKCI_API_KEY`/`LARKCI_API_URL` still accepted as a fallback with a deprecation warning. Default API URL: `https://api.getlark.ai`.

**Profile store:** `src/profile.ts` — read/write `~/.getlark/config.json` (mode `0600`), resolve the active profile, mask API keys for display.

**Interactive prompt:** `src/prompt.ts` — TTY secret prompt used by `login` when `--api-key` isn't supplied.

**API client:** `src/api/client.ts` — `GetLarkClient` class wraps fetch with X-API-Key auth. Methods organized by resource (workflows, executions, repairs, generations, events, secret-contexts, workflow-groups). Includes `pollWorkflowExecution()` for waiting on execution results.

**Types:** `src/api/types.ts` — all API resource and response types.

**Commands:** `src/commands/` — each file exports a `register*Command` function that follows the same pattern: get config → create client → execute API call → format output. Workflows sub-commands take `(workflows, program)` so they can hang off the `workflows` group; everything else takes `(program)` and registers a top-level command. Command hierarchy:
- `workflows` (list, get, create, update, archive, unarchive, invoke) with sub-resources: executions, repairs, generations, events
- `workflow-groups` (list, get, create, update, delete)
- `secret-contexts` (list, get, create, update, delete, delete-key)
- `login`, `logout`, `config` (list, use) — manage profiles in `~/.getlark/config.json`

**Exit codes:** 0 = success, 1 = failure, 2 = timeout, 3 = unexpected error.

## Key Patterns

- ES modules throughout (`type: "module"` in package.json, NodeNext module resolution)
- Node.js >= 18 required
- Strict TypeScript with source maps and declaration maps
- CLI binary entry: `./dist/index.js` → `getlark`
- `prepublishOnly` hook runs build before npm publish

## Git

- Remote: `git@github.com:getlark/larkci-cli.git`
- Default branch: `main`
