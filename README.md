# LarkCI CLI

Command-line interface for creating, invoking, and managing [LarkCI](https://getlark.ai) testing workflows.

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

| Flag                              | Required | Description                                     | Default      |
| --------------------------------- | -------- | ----------------------------------------------- | ------------ |
| `--name <name>`                   | Yes      | Workflow name                                   |              |
| `--description <description>`     | Yes      | Workflow description                            |              |
| `--mode <mode>`                   | No       | Execution mode: `ai_driven` or `deterministic`  | `ai_driven`  |
| `--secret-contexts <contexts...>` | No       | Secret contexts to attach to the workflow       |              |

```bash
# Create a deterministic workflow with secret contexts
larkci workflows create \
  --name "checkout-flow" \
  --description "Test the full checkout process" \
  --mode deterministic \
  --secret-contexts production staging
```

#### `workflows list` — List workflows

```bash
larkci workflows list
```

| Flag               | Description                     | Default |
| ------------------ | ------------------------------- | ------- |
| `--limit <number>` | Max workflows to return (1–100) | `10`    |
| `--offset <number>`| Number of workflows to skip     | `0`     |

#### `workflows invoke` — Invoke workflows

```bash
# Invoke all workflows and wait (up to 5 minutes) for completion
larkci workflows invoke --all --wait --timeout 300

# Invoke specific workflows and wait
larkci workflows invoke --workflow-ids wf_abc123 wf_def456 --wait --timeout 300
```

| Flag                      | Description                                                                      |
| ------------------------- | -------------------------------------------------------------------------------- |
| `--workflow-ids <id...>`  | The IDs of the workflows to invoke                                               |
| `--all`                   | Invoke all workflows                                                             |
| `--wait`                  | Wait for the execution to finish (successfully or unsuccessfully) before exiting |
| `--timeout <seconds>`     | Maximum time to wait in seconds (default: 600, requires `--wait`)                |
| `--verbose`               | Print verbose output (includes logs)                                             |

Either `--workflow-ids` or `--all` is required.

Exit codes: `0` = success, `1` = workflow failure, `2` = timeout, `3` = unexpected error.

#### `workflows executions list` — List executions

```bash
larkci workflows executions list <workflow_id>
```

| Flag               | Description                      | Default |
| ------------------ | -------------------------------- | ------- |
| `--limit <number>` | Max executions to return (1–100) | `10`    |
| `--offset <number>`| Number of executions to skip     | `0`     |

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

### Examples

```bash
# Create a workflow
larkci workflows create --name "signup-flow" --description "Test user signup"

# List your workflows
larkci workflows list --limit 20

# Invoke a workflow but don't wait for completion
larkci workflows invoke --workflow-ids wf_abc123

# Invoke and wait for completion (10 min default timeout)
larkci workflows invoke --workflow-ids wf_abc123 --wait

# Invoke and wait (up to 5 minutes) with verbose logs
larkci workflows invoke --workflow-ids wf_abc123 --wait --timeout 300 --verbose

# List recent executions for a workflow
larkci workflows executions list wf_abc123

# Check execution status
larkci workflows executions get wf_abc123 exec_xyz789

# Fetch execution logs
larkci workflows executions logs wf_abc123 exec_xyz789

# Cancel a running execution
larkci workflows executions cancel wf_abc123 exec_xyz789

# Override API key inline
larkci --api-key sk-test-key workflows invoke --workflow-ids wf_abc123
```

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

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

ISC
