# Contributing to getlark CLI

## Prerequisites

- Node.js >= 18
- A getlark API key

## Setup

Clone the repository and install dependencies:

```bash
git clone <repo-url>
cd larkci-cli
npm install
```

Create a `.env` file in the project root (or export the variables in your shell):

```
GETLARK_API_KEY=your-api-key
```

## Build

```bash
npm run build
```

This compiles TypeScript from `src/` into `dist/`.

## Running Locally

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
├── index.ts          # CLI entry point
├── config.ts         # Configuration / env loading
├── api/
│   ├── client.ts     # getlark API client
│   └── types.ts      # getlark API types
└── commands/
    ├── invoke.ts     # `workflows invoke` command
    ├── execution.ts  # `workflows executions` command
    └── list-workflows.ts  # `workflows list` command
```
