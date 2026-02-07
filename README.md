# LarkCI CLI

Command-line interface for invoking and managing LarkCI testing workflows.

## Prerequisites

- Node.js >= 18
- A LarkCI API key

## Setup

```bash
npm install
```

Create a `.env` file in the project root (or export the variables in your shell):

```
LARKCI_API_KEY=your-api-key
```

## Build

```bash
npm run build
```

This compiles TypeScript from `src/` into `dist/`.

## Usage

You can run the CLI in two ways:

**Development (no build step needed):**

```bash
npm run dev -- workflows <subcommand>
```

**Production (after building):**

```bash
node dist/index.js workflows <subcommand>
# or, if linked globally:
larkci workflows <subcommand>
```

### Global options

| Flag | Description |
|---|---|
| `--api-key <key>` | API key (overrides `LARKCI_API_KEY` env var) |
| `--api-url <url>` | API base URL (overrides `LARKCI_API_URL` env var) |

### Commands

#### Invoke a workflow

Start a new execution for a workflow:

```bash
larkci workflows invoke <workflow_id>
```

#### Get a workflow execution

Retrieve details of a specific execution:

```bash
larkci workflows executions get <workflow_id> <execution_id>
```

### Examples

```bash
# Invoke a workflow
larkci workflows invoke wf_abc123

# Check execution status
larkci workflows executions get wf_abc123 exec_xyz789

# Override API key inline
larkci --api-key sk-test-key workflows invoke wf_abc123
```
