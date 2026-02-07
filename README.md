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

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

ISC
