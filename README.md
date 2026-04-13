# LarkCI CLI

Command-line interface for creating, invoking, and managing [LarkCI](https://getlark.ai) testing workflows.

## Table of Contents

- [Quickstart](#quickstart)
- [Configuration](#configuration)
- [CI Pipeline Usage](#ci-pipeline-usage)
- [Usage](#usage)
  - [workflows](#commands) — create, get, update, list, archive, invoke
  - [workflows executions](#workflows-executions-get--get-execution-details) — get, logs, cancel
  - [workflows repairs](#workflows-repairs-trigger--trigger-a-workflow-repair) — trigger, list, get, cancel, logs
  - [workflows generations](#workflows-generations-cancel--cancel-a-running-generation) — cancel
  - [workflows events](#workflows-events-list--list-workflow-events) — list
  - [workflow-groups](#workflow-groups-create--create-a-workflow-group) — create, list, get, update, delete
  - [secret-contexts](#secret-contexts-list--list-secret-contexts) — list, get, create, update, delete, delete-key
  - [Examples](#examples)
- [Contributing](#contributing)
- [License](#license)

## Quickstart

Requires Node.js >= 18.

```bash
npx -y larkci@latest workflows invoke --all --wait
```

Or install globally:

```bash
npm install -g larkci@latest

larkci workflows invoke --all --wait
```

## Configuration

Set your API key as an environment variable:

```bash
export LARKCI_API_KEY=your-api-key
```

Alternatively, pass it inline with the `--api-key` flag (see [Global Options](#global-options)).

The CLI also supports a `.env` file in the current directory.

## CI Pipeline Usage

The `--wait` flag makes it easy to use in CI pipelines. The command will block until the workflow completes and exit with a non-zero code on failure.

### GitHub Actions Example

Set the `LARKCI_API_KEY` environment variable in GitHub Actions secrets.

```yaml
- name: Run LarkCI Tests
  run: npx -y larkci@latest workflows invoke --all --wait
  env:
    LARKCI_API_KEY: ${{ secrets.LARKCI_API_KEY }}
```

### CircleCI Example

Set the `LARKCI_API_KEY` environment variable in CircleCI.

```yaml
larkci_tests:
  docker:
    - image: cimg/node:lts
  resource_class: small
  steps:
    - run:
        name: Run LarkCI Tests
        command: |
          npx -y larkci@latest workflows invoke --all --wait
```

## Usage

```bash
larkci [options] <command>
```

### Global Options

| Flag              | Description                                  |
| ----------------- | -------------------------------------------- |
| `--api-key <key>` | API key (overrides `LARKCI_API_KEY` env var) |
| `-V, --version`   | Display the current version                  |
| `-h, --help`      | Display help                                 |

### Commands

#### `workflows create` — Create a workflow

```bash
larkci workflows create --name "login-flow" --description "Test the login process end-to-end"
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
larkci workflows create \
  --name "checkout-flow" \
  --description "Test the full checkout process" \
  --mode deterministic \
  --secret-contexts production staging
```

#### `workflows get` — Get workflow details

```bash
larkci workflows get <workflow_id>
```

Returns the full workflow resource including status, mode, schedule, and last execution/generation/repair info.

#### `workflows update` — Update a workflow

```bash
larkci workflows update <workflow_id> --name "new-name" --description "updated description"
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
larkci workflows archive <workflow_id>
```

Archived workflows are hidden from the default list and cannot be invoked until unarchived.

#### `workflows unarchive` — Unarchive a workflow

```bash
larkci workflows unarchive <workflow_id>
```

Restores an archived workflow so it appears in the list and can be invoked again.

#### `workflows list` — List workflows

```bash
larkci workflows list
```

| Flag                   | Description                     | Default |
| ---------------------- | ------------------------------- | ------- |
| `--limit <number>`     | Max workflows to return (1–100) | `10`    |
| `--offset <number>`    | Number of workflows to skip     | `0`     |
| `--group-id <groupId>` | Filter workflows by group ID    |         |

#### `workflows invoke` — Invoke workflows

```bash
# Invoke all workflows and wait (up to 5 minutes) for completion
larkci workflows invoke --all --wait --timeout 300

# Invoke specific workflows and wait
larkci workflows invoke --workflow-ids wf_abc123 wf_def456 --wait --timeout 300

# Invoke all workflows in a group by ID
larkci workflows invoke --group-id wfl_grp_abc123 --wait

# Invoke all workflows in a group by name
larkci workflows invoke --group-name "Checkout Flow" --wait
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
larkci workflows executions get <workflow_id> <execution_id>
```

#### `workflows executions logs` — Get execution logs

```bash
larkci workflows executions logs <workflow_id> <execution_id>
```

#### `workflows executions cancel` — Cancel a running execution

```bash
larkci workflows executions cancel <workflow_id> <execution_id>
```

#### `workflows repairs trigger` — Trigger a workflow repair

```bash
larkci workflows repairs trigger <workflow_id>
```

Triggers a repair for a workflow. Returns the repair resource.

#### `workflows repairs list` — List workflow repairs

```bash
larkci workflows repairs list <workflow_id>
```

| Flag                | Description                   | Default |
| ------------------- | ----------------------------- | ------- |
| `--limit <number>`  | Max repairs to return (1–100) | `10`    |
| `--offset <number>` | Number of repairs to skip     | `0`     |

#### `workflows repairs get` — Get repair details

```bash
larkci workflows repairs get <workflow_id> <repair_id>
```

#### `workflows repairs cancel` — Cancel a running repair

```bash
larkci workflows repairs cancel <workflow_id> <repair_id>
```

#### `workflows repairs logs` — Get repair logs

```bash
larkci workflows repairs logs <workflow_id> <repair_id>
```

#### `workflows generations cancel` — Cancel a running generation

```bash
larkci workflows generations cancel <workflow_id> <generation_id>
```

#### `workflows events list` — List workflow events

```bash
larkci workflows events list <workflow_id>
```

| Flag                | Description                  | Default |
| ------------------- | ---------------------------- | ------- |
| `--limit <number>`  | Max events to return (1–100) | `10`    |
| `--offset <number>` | Number of events to skip     | `0`     |

Lists all events (generations, executions, repairs) for a workflow.

#### `workflow-groups create` — Create a workflow group

```bash
larkci workflow-groups create --name "Checkout Flow"
```

| Flag            | Required | Description                |
| --------------- | -------- | -------------------------- |
| `--name <name>` | Yes      | Name of the workflow group |

#### `workflow-groups list` — List workflow groups

```bash
larkci workflow-groups list
```

| Flag                | Description                  | Default |
| ------------------- | ---------------------------- | ------- |
| `--limit <number>`  | Max groups to return (1–100) | `10`    |
| `--offset <number>` | Number of groups to skip     | `0`     |

#### `workflow-groups get` — Get a workflow group

```bash
larkci workflow-groups get <group_id>
```

#### `workflow-groups update` — Update a workflow group

```bash
larkci workflow-groups update <group_id> --name "Updated Name"
```

| Flag            | Description                     |
| --------------- | ------------------------------- |
| `--name <name>` | New name for the workflow group |

#### `workflow-groups delete` — Delete a workflow group

```bash
larkci workflow-groups delete <group_id>
```

Workflows in the group become ungrouped.

#### `secret-contexts list` — List secret contexts

```bash
larkci secret-contexts list
```

Returns all secret context names and metadata for your account. Does not return secret values.

#### `secret-contexts get` — Get a secret context

```bash
larkci secret-contexts get <context>
```

Returns the context name and the list of key names stored in it. Does not return secret values.

#### `secret-contexts create` — Create or replace a secret context

```bash
larkci secret-contexts create --context production --secret username=admin --secret password=s3cret
```

| Flag                   | Required | Description                                        |
| ---------------------- | -------- | -------------------------------------------------- |
| `--context <name>`     | Yes      | Name of the secret context                         |
| `--secret <key=value>` | Yes      | Secret key-value pair (repeat for multiple values) |

```bash
# Create a secret context with multiple credentials
larkci secret-contexts create \
  --context staging \
  --secret api_key=sk_test_abc123 \
  --secret username=testuser \
  --secret password=testpass
```

#### `secret-contexts update` — Update a key in a secret context

```bash
larkci secret-contexts update <context> --key <key> --value <value>
```

| Flag              | Required | Description                 |
| ----------------- | -------- | --------------------------- |
| `--key <key>`     | Yes      | The key to create or update |
| `--value <value>` | Yes      | The new value for the key   |

If the key already exists its value is replaced; if it does not exist it is added.

#### `secret-contexts delete` — Delete a secret context

```bash
larkci secret-contexts delete <context>
```

Permanently deletes a secret context. Workflows referencing it will no longer have access.

#### `secret-contexts delete-key` — Delete a key from a secret context

```bash
larkci secret-contexts delete-key <context> <key>
```

Removes a single key-value pair from an existing secret context.

### Examples

```bash
# Create a workflow
larkci workflows create --name "signup-flow" --description "Test user signup"

# Get workflow details
larkci workflows get wf_abc123

# Update a workflow
larkci workflows update wf_abc123 --name "updated-signup-flow" --schedule "0 9 * * *"

# List your workflows
larkci workflows list --limit 20

# List workflows in a group
larkci workflows list --group-id grp_abc123

# Archive a workflow
larkci workflows archive wf_abc123

# Unarchive a workflow
larkci workflows unarchive wf_abc123

# Invoke a workflow but don't wait for completion
larkci workflows invoke --workflow-ids wf_abc123

# Invoke and wait for completion (10 min default timeout)
larkci workflows invoke --workflow-ids wf_abc123 --wait

# Invoke and wait (up to 5 minutes) with verbose logs
larkci workflows invoke --workflow-ids wf_abc123 --wait --timeout 300 --verbose

# Invoke all workflows in a group by ID
larkci workflows invoke --group-id wfl_grp_abc123 --wait

# Invoke all workflows in a group by name
larkci workflows invoke --group-name "Checkout Flow" --wait

# Check execution status
larkci workflows executions get wf_abc123 exec_xyz789

# Fetch execution logs
larkci workflows executions logs wf_abc123 exec_xyz789

# Cancel a running execution
larkci workflows executions cancel wf_abc123 exec_xyz789

# Trigger a repair
larkci workflows repairs trigger wf_abc123

# List repairs
larkci workflows repairs list wf_abc123

# Cancel a generation
larkci workflows generations cancel wf_abc123 gen_xyz789

# List events
larkci workflows events list wf_abc123

# Create a workflow group
larkci workflow-groups create --name "Checkout Flow"

# List workflow groups
larkci workflow-groups list

# Delete a workflow group
larkci workflow-groups delete grp_abc123

# Override API key inline
larkci --api-key sk-test-key workflows invoke --workflow-ids wf_abc123

# Store credentials for a secret context
larkci secret-contexts create --context production --secret username=admin --secret password=s3cret

# Update a single key in a secret context
larkci secret-contexts update production --key password --value new-s3cret

# List all secret contexts
larkci secret-contexts list

# View the keys stored in a secret context
larkci secret-contexts get production

# Delete a key from a secret context
larkci secret-contexts delete-key production password

# Delete a secret context
larkci secret-contexts delete production
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

ISC
