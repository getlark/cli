# Contributing to getlark CLI

## Prerequisites

- Node.js >= 18
- A getlark API key

## Setup

Clone the repository and install dependencies:

```bash
git clone <repo-url> getlark-cli
cd getlark-cli
npm install
```

## Build

```bash
npm run build
```

This compiles TypeScript from `src/` into `dist/`.

## Running Locally

**Authenticate:**
```bash
getlark login
```

This will prompt you to enter your API key.


**Development (no build step needed):**

```bash
npm run dev -- workflows <subcommand>
```

**Production (after building):**

```bash
node dist/index.js workflows <subcommand>
```

You can also link the CLI globally for local testing:

```bash
npm link
getlark workflows <subcommand>
```

## Scripts

| Script              | Description                             |
| ------------------- | --------------------------------------- |
| `npm run build`     | Compile TypeScript to `dist/`           |
| `npm run dev`       | Run the CLI via `tsx` (no build needed) |
| `npm run start`     | Run the built CLI from `dist/`          |
| `npm run typecheck` | Type-check without emitting files       |

## Project Structure

```
src/
├── index.ts          # CLI entry point — registers commands and global options
├── config.ts         # Resolves API key/URL from flag, env, profile
├── profile.ts        # Read/write ~/.getlark/config.json profiles
├── prompt.ts         # Interactive secret prompt for `login`
├── api/
│   ├── client.ts     # GetLarkClient — wraps fetch with X-API-Key auth
│   └── types.ts      # API resource and response types
└── commands/
    ├── login.ts              # `login` — save API key to a profile
    ├── logout.ts             # `logout` — remove a profile
    ├── config.ts             # `config list` / `config use`
    ├── list-workflows.ts     # `workflows list`
    ├── get-workflow.ts       # `workflows get`
    ├── create-workflow.ts    # `workflows create`
    ├── update-workflow.ts    # `workflows update`
    ├── archive-workflow.ts   # `workflows archive` / `unarchive`
    ├── invoke.ts             # `workflows invoke` (+ --wait polling)
    ├── execution.ts          # `workflows executions` (get/logs/cancel)
    ├── repairs.ts            # `workflows repairs` (trigger/list/get/cancel/logs)
    ├── generations.ts        # `workflows generations cancel`
    ├── events.ts             # `workflows events list`
    ├── workflow-groups.ts    # `workflow-groups` (CRUD)
    └── secret-contexts.ts    # `secret-contexts` (CRUD + delete-key)
```
