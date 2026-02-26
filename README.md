# LarkCI CLI

Command-line interface for invoking and managing LarkCI testing workflows.

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

#### Invoke workflows

```bash
# Invoke all workflows and wait (up to 5 minutes) for completion
larkci workflows invoke --all --wait --timeout 300

# Invoke specific workflows and wait (up to 5 minutes) for completion
larkci workflows invoke --workflow-ids wf_abc123 wf_def456 wf_ghi789 --wait --timeout 300
```

| Flag                     | Description                                                                      |
| ------------------------ | -------------------------------------------------------------------------------- |
| `--workflow-ids <id...>` | The IDs of the workflow to invoke                                                |
| `--all`                  | Invoke all workflows                                                             |
| `--wait`                 | Wait for the execution to finish (successfully or unsuccessfully) before exiting |
| `--timeout <seconds>`    | Maximum time to wait in seconds (default: 600, requires `--wait`)                |
| `--verbose`              | Print verbose output (includes logs)                                             |

Exit codes: `0` = success, `1` = workflow failure, `2` = timeout, `3` = unexpected error.

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
# Invoke a workflow but don't wait for completion
larkci workflows invoke wf_abc123

# Invoke and wait for completion (10 min default timeout)
larkci workflows invoke wf_abc123 --wait

# Invoke and wait (up to 5 minutes) for completion
larkci workflows invoke wf_abc123 --wait --timeout 300

# Check execution status
larkci workflows executions get wf_abc123 exec_xyz789

# Fetch execution logs
larkci workflows executions logs wf_abc123 exec_xyz789

# Override API key inline
larkci --api-key sk-test-key workflows invoke wf_abc123
```

## CI Pipeline Usage

The `--wait` flag makes it easy to use in CI pipelines. The command will block until the workflow completes and exit with a non-zero code on failure:

### GitHub Actions Example

Be sure to set the `LARKCI_API_KEY` environment variable in GitHub Actions secrets.

```yaml
- name: Run LarkCI Tests
  run: npx -y larkci@latest workflows invoke --all --wait
  env:
    LARKCI_API_KEY: ${{ secrets.LARKCI_API_KEY }}
```

### CircleCI Example

Be sure to set the `LARKCI_API_KEY` environment variable in CircleCI.

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
