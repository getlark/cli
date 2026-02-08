# LarkCI CLI

Command-line interface for invoking and managing LarkCI testing workflows.

## Installation

Requires Node.js >= 18.

```bash
npm install -g larkci
```

Or run directly without installing:

```bash
npx larkci <command>
```

## Configuration

Set your API key as an environment variable:

```bash
export LARKCI_API_KEY=your-api-key
```

Alternatively, pass it inline with the `--api-key` flag (see [Global Options](#global-options)).

## Usage

```bash
larkci [options] <command>
```

### Global Options

| Flag | Description |
|---|---|
| `--api-key <key>` | API key (overrides `LARKCI_API_KEY` env var) |
| `-V, --version` | Display the current version |
| `-h, --help` | Display help |

### Commands

#### Invoke a workflow

Start a new execution for a workflow:

```bash
larkci workflows invoke <workflow_id>
```

| Flag | Description |
|---|---|
| `--wait` | Wait for the execution to reach a terminal status before exiting |
| `--timeout <seconds>` | Maximum time to wait in seconds (default: 600, requires `--wait`) |

When `--wait` is used, progress updates are printed to stderr and the final execution JSON is printed to stdout. Exit codes: `0` = success, `1` = workflow failure, `2` = timeout, `3` = unexpected error.

#### Get a workflow execution

Retrieve details of a specific execution:

```bash
larkci workflows executions get <workflow_id> <execution_id>
```

#### Get execution logs

Retrieve logs for a specific execution:

```bash
larkci workflows executions logs <workflow_id> <execution_id>
```

### Examples

```bash
# Invoke a workflow
larkci workflows invoke wf_abc123

# Invoke and wait for completion (10 min default timeout)
larkci workflows invoke wf_abc123 --wait

# Invoke and wait with a custom timeout of 5 minutes
larkci workflows invoke wf_abc123 --wait --timeout 300

# Check execution status
larkci workflows executions get wf_abc123 exec_xyz789

# Fetch execution logs
larkci workflows executions logs wf_abc123 exec_xyz789

# Override API key inline
larkci --api-key sk-test-key workflows invoke wf_abc123
```

### CI Pipeline Usage

The `--wait` flag makes it easy to use in CI pipelines. The command will block until the workflow completes and exit with a non-zero code on failure:

```yaml
# GitHub Actions example
- name: Run LarkCI workflow
  run: larkci workflows invoke ${{ vars.WORKFLOW_ID }} --wait --timeout 300
  env:
    LARKCI_API_KEY: ${{ secrets.LARKCI_API_KEY }}
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

ISC
