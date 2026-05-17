# getlark CLI

Command-line interface for creating, invoking, and managing [getlark](https://getlark.ai) testing workflows.

## Table of Contents

- [Quickstart](#quickstart)
- [Configuration](#configuration)
- [Use with AI coding agents](#use-with-ai-coding-agents)
- [CI Pipeline Usage](#ci-pipeline-usage)
- [Usage](#usage)
  - [workflows](#commands) — create, get, update, list, archive, invoke
  - [workflows executions](#workflows-executions-get--get-execution-details) — get, logs, cancel
  - [workflows repairs](#workflows-repairs-trigger--trigger-a-workflow-repair) — trigger, list, get, cancel, logs
  - [workflows generations](#workflows-generations-cancel--cancel-a-running-generation) — cancel
  - [workflows events](#workflows-events-list--list-workflow-events) — list
  - [workflow-groups](#workflow-groups-create--create-a-workflow-group) — create, list, get, update, delete
  - [jobs](#jobs-create--create-a-job-from-an-inline-json-input-file) — create, list, get, cancel, upload, validate
  - [secret-contexts](#secret-contexts-list--list-secret-contexts) — list, get, create, update, delete, delete-key
  - [Examples](#examples)
- [Contributing](#contributing)
- [License](#license)

## Quickstart

Requires Node.js >= 18.

```bash
npx -y @getlark/cli@latest workflows invoke --all --wait
```

Or install globally:

```bash
npm install -g @getlark/cli@latest

getlark workflows invoke --all --wait
```

## Configuration

The fastest way to authenticate is `getlark login`:

```bash
getlark login                          # prompts for your API key
getlark login --api-key your-api-key   # non-interactive
```

This stores your credentials at `~/.getlark/config.json` (mode `0600`) so subsequent commands work in any new shell — no need to reload your shell or re-export an env var.

The CLI resolves the API key in this order: `--api-key` flag → `GETLARK_API_KEY` env var → `~/.getlark/config.json` → error. The same precedence applies to `--api-url` / `GETLARK_API_URL`. CI usage is unchanged — keep using the env var.

### Profiles

If you work across multiple getlark accounts, use named profiles:

```bash
getlark --profile staging login        # save a second profile
getlark config list                    # show all profiles (* = active)
getlark config use staging             # switch the active profile
getlark --profile staging workflows list   # one-shot override
getlark --profile staging logout       # remove the profile
```

The CLI also supports a `.env` file in the current directory.

## Use with AI coding agents

Lark ships [Agent Skills](https://docs.getlark.ai/agents) that teach Claude Code, Cursor, and other agents how to author, invoke, and manage workflows through the `getlark` CLI — no per-session priming required.

**Claude Code plugin** (skills + `/getlark:*` slash commands + optional branch-validation hook):

```
/plugin marketplace add getlark/skills
/plugin install getlark
/reload-plugins
/getlark:setup
```

**Any other agent** (Cursor, Codex, OpenCode, Windsurf, Gemini CLI, Copilot, …) via the [Vercel Skills CLI](https://github.com/vercel-labs/skills):

```bash
npx skills add getlark/skills
```

Then ask the agent to run the `setup` skill. See the [Agents docs](https://docs.getlark.ai/agents) for the full skill catalog and the opt-in `PostToolUse` hook that validates your branch after every `git commit` or `git push`.

## CI Pipeline Usage

The `--wait` flag makes it easy to use in CI pipelines. The command will block until the workflow completes and exit with a non-zero code on failure.

### GitHub Actions Example

Set the `GETLARK_API_KEY` environment variable in GitHub Actions secrets.

```yaml
- name: Run getlark Tests
  run: npx -y @getlark/cli@latest workflows invoke --all --wait
  env:
    GETLARK_API_KEY: ${{ secrets.GETLARK_API_KEY }}
```

### CircleCI Example

Set the `GETLARK_API_KEY` environment variable in CircleCI.

```yaml
getlark_tests:
  docker:
    - image: cimg/node:lts
  resource_class: small
  steps:
    - run:
        name: Run getlark Tests
        command: |
          npx -y @getlark/cli@latest workflows invoke --all --wait
```

## Usage

```bash
getlark [options] <command>
```

### Global Options

| Flag               | Description                                                  |
| ------------------ | ------------------------------------------------------------ |
| `--api-key <key>`  | API key (overrides `GETLARK_API_KEY` env var and stored config) |
| `--profile <name>` | Profile to read from `~/.getlark/config.json`                |
| `-V, --version`    | Display the current version                                  |
| `-h, --help`       | Display help                                                 |

### Commands

#### `workflows create` — Create a workflow

```bash
getlark workflows create --name "login-flow" --description "Test the login process end-to-end"
```

| Flag                              | Required | Description                                    | Default     |
| --------------------------------- | -------- | ---------------------------------------------- | ----------- |
| `--name <name>`                   | Yes      | Workflow name                                  |             |
| `--description <description>`     | Yes      | Workflow description                           |             |
| `--mode <mode>`                   | No       | Execution mode: `ai_driven` or `deterministic` | `ai_driven` |
| `--secret-contexts <contexts...>` | No       | Secret contexts to attach to the workflow      |             |
| `--group-id <groupId>`            | No       | Workflow group ID to assign this workflow to   |             |

```bash
# Create a deterministic workflow with secret contexts
getlark workflows create \
  --name "checkout-flow" \
  --description "Test the full checkout process" \
  --mode deterministic \
  --secret-contexts production staging
```

#### `workflows get` — Get workflow details

```bash
getlark workflows get <workflow_id>
```

Returns the full workflow resource including status, mode, schedule, and last execution/generation/repair info.

#### `workflows update` — Update a workflow

```bash
getlark workflows update <workflow_id> --name "new-name" --description "updated description"
```

| Flag                              | Description                               |
| --------------------------------- | ----------------------------------------- |
| `--name <name>`                   | New name for the workflow                 |
| `--description <description>`     | New description for the workflow          |
| `--secret-contexts <contexts...>` | Secret contexts to attach                 |
| `--schedule <cron>`               | Cron schedule for the workflow            |
| `--group-id <groupId>`            | Workflow group ID (use `null` to ungroup) |

At least one option is required.

#### `workflows archive` — Archive a workflow

```bash
getlark workflows archive <workflow_id>
```

Archived workflows are hidden from the default list and cannot be invoked until unarchived.

#### `workflows unarchive` — Unarchive a workflow

```bash
getlark workflows unarchive <workflow_id>
```

Restores an archived workflow so it appears in the list and can be invoked again.

#### `workflows list` — List workflows

```bash
getlark workflows list
```

| Flag                   | Description                     | Default |
| ---------------------- | ------------------------------- | ------- |
| `--limit <number>`     | Max workflows to return (1–100) | `10`    |
| `--offset <number>`    | Number of workflows to skip     | `0`     |
| `--group-id <groupId>` | Filter workflows by group ID    |         |

#### `workflows invoke` — Invoke workflows

```bash
# Invoke all workflows and wait (up to 5 minutes) for completion
getlark workflows invoke --all --wait --timeout 300

# Invoke specific workflows and wait
getlark workflows invoke --workflow-ids wf_abc123 wf_def456 --wait --timeout 300

# Invoke all workflows in a group by ID
getlark workflows invoke --group-id wfl_grp_abc123 --wait

# Invoke all workflows in a group by name
getlark workflows invoke --group-name "Checkout Flow" --wait
```

| Flag                       | Description                                                                      |
| -------------------------- | -------------------------------------------------------------------------------- |
| `--workflow-ids <id...>`   | The IDs of the workflows to invoke                                               |
| `--all`                    | Invoke all workflows                                                             |
| `--group-id <groupId>`     | Invoke all workflows in a group (by group ID)                                    |
| `--group-name <groupName>` | Invoke all workflows in a group (by group name)                                  |
| `--wait`                   | Wait for the execution to finish (successfully or unsuccessfully) before exiting |
| `--timeout <seconds>`      | Maximum time to wait in seconds (default: 600, requires `--wait`)                |
| `--verbose`                | Print verbose output (includes logs)                                             |

One of `--workflow-ids`, `--all`, `--group-id`, or `--group-name` is required.

Exit codes: `0` = success, `1` = workflow failure, `2` = timeout, `3` = unexpected error.

#### `workflows executions get` — Get execution details

```bash
getlark workflows executions get <workflow_id> <execution_id>
```

#### `workflows executions logs` — Get execution logs

```bash
getlark workflows executions logs <workflow_id> <execution_id>
```

#### `workflows executions cancel` — Cancel a running execution

```bash
getlark workflows executions cancel <workflow_id> <execution_id>
```

#### `workflows repairs trigger` — Trigger a workflow repair

```bash
getlark workflows repairs trigger <workflow_id>
```

Triggers a repair for a workflow. Returns the repair resource.

#### `workflows repairs list` — List workflow repairs

```bash
getlark workflows repairs list <workflow_id>
```

| Flag                | Description                   | Default |
| ------------------- | ----------------------------- | ------- |
| `--limit <number>`  | Max repairs to return (1–100) | `10`    |
| `--offset <number>` | Number of repairs to skip     | `0`     |

#### `workflows repairs get` — Get repair details

```bash
getlark workflows repairs get <workflow_id> <repair_id>
```

#### `workflows repairs cancel` — Cancel a running repair

```bash
getlark workflows repairs cancel <workflow_id> <repair_id>
```

#### `workflows repairs logs` — Get repair logs

```bash
getlark workflows repairs logs <workflow_id> <repair_id>
```

#### `workflows generations cancel` — Cancel a running generation

```bash
getlark workflows generations cancel <workflow_id> <generation_id>
```

#### `workflows events list` — List workflow events

```bash
getlark workflows events list <workflow_id>
```

| Flag                | Description                  | Default |
| ------------------- | ---------------------------- | ------- |
| `--limit <number>`  | Max events to return (1–100) | `10`    |
| `--offset <number>` | Number of events to skip     | `0`     |

Lists all events (generations, executions, repairs) for a workflow.

#### `workflow-groups create` — Create a workflow group

```bash
getlark workflow-groups create --name "Checkout Flow"
```

| Flag            | Required | Description                |
| --------------- | -------- | -------------------------- |
| `--name <name>` | Yes      | Name of the workflow group |

#### `workflow-groups list` — List workflow groups

```bash
getlark workflow-groups list
```

| Flag                | Description                  | Default |
| ------------------- | ---------------------------- | ------- |
| `--limit <number>`  | Max groups to return (1–100) | `10`    |
| `--offset <number>` | Number of groups to skip     | `0`     |

#### `workflow-groups get` — Get a workflow group

```bash
getlark workflow-groups get <group_id>
```

#### `workflow-groups update` — Update a workflow group

```bash
getlark workflow-groups update <group_id> --name "Updated Name"
```

| Flag            | Description                     |
| --------------- | ------------------------------- |
| `--name <name>` | New name for the workflow group |

#### `workflow-groups delete` — Delete a workflow group

```bash
getlark workflow-groups delete <group_id>
```

Workflows in the group become ungrouped.

#### `jobs create` — Create a job from an inline JSON input file

```bash
larkci jobs create --name "Import workflows" --input-file ./workflows.json
```

| Flag                   | Required | Description                                                            | Default            |
| ---------------------- | -------- | ---------------------------------------------------------------------- | ------------------ |
| `--name <name>`        | Yes      | Human-readable name for the job                                        |                    |
| `--input-file <path>`  | Yes      | Path to a JSON file with the job input (see schema below)              |                    |
| `--type <type>`        | No       | Job type. Currently only `workflow_import` is supported.               | `workflow_import`  |

##### `workflow_import` input file schema

The input file is a single JSON object. The same file is accepted by `jobs create`, `jobs upload`, and `jobs validate`.

Top-level object:

| Field         | Type                       | Required | Description                                                          |
| ------------- | -------------------------- | -------- | -------------------------------------------------------------------- |
| `workflows`   | array of workflow entries  | Yes      | One or more workflows to import. Must contain at least one entry.    |

Each entry under `workflows`:

| Field              | Type                                  | Required | Description                                                                                          |
| ------------------ | ------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------- |
| `name`             | string (non-empty)                    | Yes      | Workflow name.                                                                                       |
| `description`      | string (non-empty)                    | Yes      | Workflow description; the AI agent reads this at runtime to perform the test.                        |
| `mode`             | `"ai_driven"` \| `"deterministic"`    | Yes      | Execution mode for the workflow.                                                                     |
| `secret_contexts`  | array of unique strings \| `null`     | No       | Secret context names the workflow may use. Omit or set `null` for no secret contexts.                |
| `group_id`         | string \| `null`                      | No       | ID of the workflow group to assign the workflow to. Omit or set `null` to leave it ungrouped.        |

No additional properties are accepted at the top level or per workflow.

Example `workflows.json`:

```json
{
  "workflows": [
    {
      "name": "Checkout smoke",
      "description": "Verify checkout works end-to-end with a test card.",
      "mode": "ai_driven",
      "secret_contexts": ["staging"],
      "group_id": "wgrp_01h..."
    },
    {
      "name": "Login regression",
      "description": "Log in with seeded credentials and confirm the dashboard loads.",
      "mode": "deterministic"
    }
  ]
}
```

Tip: run `larkci jobs validate --file ./workflows.json` before submitting to catch schema errors without creating a job.

#### `jobs list` — List jobs

```bash
larkci jobs list --status pending --status running
```

| Flag                  | Description                                                                                | Default |
| --------------------- | ------------------------------------------------------------------------------------------ | ------- |
| `--limit <number>`    | Max jobs to return (1–100)                                                                 | `20`    |
| `--offset <number>`   | Number of jobs to skip                                                                     | `0`     |
| `--status <status>`   | Filter by status (`pending`, `running`, `completed`, `failed`, `cancelled`); repeatable    |         |

#### `jobs get` — Get a job

```bash
larkci jobs get <job_id>
```

#### `jobs cancel` — Cancel a job

```bash
larkci jobs cancel <job_id>
```

Cancels a pending or running job.

#### `jobs upload` — Create a job by uploading an input file

```bash
larkci jobs upload --name "Import workflows" --file ./workflows.json
```

| Flag             | Required | Description                                                                            | Default            |
| ---------------- | -------- | -------------------------------------------------------------------------------------- | ------------------ |
| `--name <name>`  | Yes      | Human-readable name for the job                                                        |                    |
| `--file <path>`  | Yes      | Path to the input file (same schema as [`jobs create`](#workflow_import-input-file-schema)) |                    |
| `--type <type>`  | No       | Job type. Currently only `workflow_import` is supported.                               | `workflow_import`  |

Sends the file as `multipart/form-data` to `/jobs/upload`. The job stores the original filename so you can retrieve it later from `larkci jobs get`.

#### `jobs validate` — Validate an input file without creating a job

```bash
larkci jobs validate --file ./workflows.json
```

| Flag             | Required | Description                                                                            | Default            |
| ---------------- | -------- | -------------------------------------------------------------------------------------- | ------------------ |
| `--file <path>`  | Yes      | Path to the input file (same schema as [`jobs create`](#workflow_import-input-file-schema)) |                    |
| `--type <type>`  | No       | Job type. Currently only `workflow_import` is supported.                               | `workflow_import`  |

Prints the validation report and exits non-zero if `valid: false`.

#### `secret-contexts list` — List secret contexts

```bash
getlark secret-contexts list
```

Returns all secret context names and metadata for your account. Does not return secret values.

#### `secret-contexts get` — Get a secret context

```bash
getlark secret-contexts get <context>
```

Returns the context name and the list of key names stored in it. Does not return secret values.

#### `secret-contexts create` — Create or replace a secret context

```bash
getlark secret-contexts create --context production --secret username=admin --secret password=s3cret
```

| Flag                   | Required | Description                                        |
| ---------------------- | -------- | -------------------------------------------------- |
| `--context <name>`     | Yes      | Name of the secret context                         |
| `--secret <key=value>` | Yes      | Secret key-value pair (repeat for multiple values) |

```bash
# Create a secret context with multiple credentials
getlark secret-contexts create \
  --context staging \
  --secret api_key=sk_test_abc123 \
  --secret username=testuser \
  --secret password=testpass
```

#### `secret-contexts update` — Update a key in a secret context

```bash
getlark secret-contexts update <context> --key <key> --value <value>
```

| Flag              | Required | Description                 |
| ----------------- | -------- | --------------------------- |
| `--key <key>`     | Yes      | The key to create or update |
| `--value <value>` | Yes      | The new value for the key   |

If the key already exists its value is replaced; if it does not exist it is added.

#### `secret-contexts delete` — Delete a secret context

```bash
getlark secret-contexts delete <context>
```

Permanently deletes a secret context. Workflows referencing it will no longer have access.

#### `secret-contexts delete-key` — Delete a key from a secret context

```bash
getlark secret-contexts delete-key <context> <key>
```

Removes a single key-value pair from an existing secret context.

### Examples

```bash
# Create a workflow
getlark workflows create --name "signup-flow" --description "Test user signup"

# Get workflow details
getlark workflows get wf_abc123

# Update a workflow
getlark workflows update wf_abc123 --name "updated-signup-flow" --schedule "0 9 * * *"

# List your workflows
getlark workflows list --limit 20

# List workflows in a group
getlark workflows list --group-id grp_abc123

# Archive a workflow
getlark workflows archive wf_abc123

# Unarchive a workflow
getlark workflows unarchive wf_abc123

# Invoke a workflow but don't wait for completion
getlark workflows invoke --workflow-ids wf_abc123

# Invoke and wait for completion (10 min default timeout)
getlark workflows invoke --workflow-ids wf_abc123 --wait

# Invoke and wait (up to 5 minutes) with verbose logs
getlark workflows invoke --workflow-ids wf_abc123 --wait --timeout 300 --verbose

# Invoke all workflows in a group by ID
getlark workflows invoke --group-id wfl_grp_abc123 --wait

# Invoke all workflows in a group by name
getlark workflows invoke --group-name "Checkout Flow" --wait

# Check execution status
getlark workflows executions get wf_abc123 exec_xyz789

# Fetch execution logs
getlark workflows executions logs wf_abc123 exec_xyz789

# Cancel a running execution
getlark workflows executions cancel wf_abc123 exec_xyz789

# Trigger a repair
getlark workflows repairs trigger wf_abc123

# List repairs
getlark workflows repairs list wf_abc123

# Cancel a generation
getlark workflows generations cancel wf_abc123 gen_xyz789

# List events
getlark workflows events list wf_abc123

# Create a workflow group
getlark workflow-groups create --name "Checkout Flow"

# List workflow groups
getlark workflow-groups list

# Delete a workflow group
getlark workflow-groups delete grp_abc123

# Override API key inline
getlark --api-key sk-test-key workflows invoke --workflow-ids wf_abc123

# Store credentials for a secret context
getlark secret-contexts create --context production --secret username=admin --secret password=s3cret

# Update a single key in a secret context
getlark secret-contexts update production --key password --value new-s3cret

# List all secret contexts
getlark secret-contexts list

# View the keys stored in a secret context
getlark secret-contexts get production

# Delete a key from a secret context
getlark secret-contexts delete-key production password

# Delete a secret context
getlark secret-contexts delete production
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

ISC
