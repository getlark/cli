import { Option, type Command } from "commander";
import { LarkCIClient, TimeoutError } from "../api/client.js";
import { getConfig } from "../config.js";
import type {
  WorkflowExecutionResource,
  WorkflowResource,
  WorkflowGroupResource,
} from "../api/types.js";

const PAGE_SIZE = 100;

async function fetchAllWorkflows(
  client: LarkCIClient,
  options?: { group_id?: string },
): Promise<WorkflowResource[]> {
  const all: WorkflowResource[] = [];
  let offset = 0;
  while (true) {
    const response = await client.listWorkflows({
      limit: PAGE_SIZE,
      offset,
      group_id: options?.group_id,
    });
    all.push(...response.workflows);
    if (!response.has_more) break;
    offset += PAGE_SIZE;
  }
  return all;
}

async function findGroupByName(
  client: LarkCIClient,
  name: string,
): Promise<WorkflowGroupResource | undefined> {
  let offset = 0;
  while (true) {
    const response = await client.listWorkflowGroups({
      limit: PAGE_SIZE,
      offset,
    });
    const match = response.workflow_groups.find((g) => g.name === name);
    if (match) return match;
    if (!response.has_more) return undefined;
    offset += PAGE_SIZE;
  }
}

const DEFAULT_TIMEOUT_SECONDS = 600;
const POLL_INTERVAL_MS = 5_000;

function formatElapsed(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m${seconds}s`;
}

const logForWorkflow = (
  workflowId: string,
  message?: any,
  ...optionalParams: any[]
) => {
  console.log(`[${workflowId}] ${message}`, ...optionalParams);
};

async function invokeWorkflow(
  client: LarkCIClient,
  workflowId: string,
  wait: boolean,
  timeoutSeconds: number,
  verbose: boolean,
): Promise<WorkflowExecutionResource> {
  const execution = await client.invokeWorkflow(workflowId);
  if (!wait) {
    return execution;
  }

  let logOffset = 0;

  const finalExecution = await client.pollWorkflowExecution(
    workflowId,
    execution.id,
    {
      timeoutMs: timeoutSeconds * 1000,
      pollIntervalMs: POLL_INTERVAL_MS,
      onPoll: async (exec, elapsedMs) => {
        if (!verbose) {
          return;
        }
        logForWorkflow(
          workflowId,
          "Status: %s (%s elapsed)",
          exec.status,
          formatElapsed(elapsedMs),
        );

        try {
          const logs = await client.getWorkflowExecutionLogs(
            workflowId,
            execution.id,
          );
          if (logs.length > logOffset) {
            for (const line of logs.slice(logOffset)) {
              logForWorkflow(workflowId, "Log: %s", line);
            }
            logOffset = logs.length;
          }
        } catch {
          // Logs may not be available yet (e.g. execution is still pending)
        }
      },
    },
  );

  return finalExecution;
}

export function registerInvokeCommand(
  workflows: Command,
  program: Command,
): void {
  workflows
    .command("invoke")
    .description("Invoke workflow(s)")
    .option("--workflow-ids <id...>", "The IDs of the workflow to invoke")
    .option("--all", "Invoke all workflows", false)
    .option(
      "--group-id <groupId>",
      "Invoke all workflows in a group (by group ID)",
    )
    .option(
      "--group-name <groupName>",
      "Invoke all workflows in a group (by group name)",
    )
    .option("--verbose", "Verbose output", false)
    .option(
      "--wait",
      "Wait for the execution to reach a terminal status before exiting",
      false,
    )
    .addOption(
      new Option("--timeout <seconds>", "Maximum time to wait in seconds.")
        .preset(600)
        .argParser(Number),
    )
    .addHelpText(
      "after",
      "\nRun all workflows and wait for completion:\n$ larkci workflows invoke --all --wait",
    )
    .addHelpText(
      "after",
      "\nRun a specific workflow and wait for completion:\n$ larkci workflows invoke --workflow-ids wf_abc123 --wait",
    )
    .addHelpText(
      "after",
      "\nRun all workflows in a group:\n$ larkci workflows invoke --group-id wfl_grp_abc123 --wait",
    )
    .addHelpText(
      "after",
      '\nRun all workflows in a group by name:\n$ larkci workflows invoke --group-name "Checkout Flow" --wait',
    )
    .action(
      async (cmdOpts: {
        workflowIds?: string[];
        all?: boolean;
        groupId?: string;
        groupName?: string;
        wait?: boolean;
        timeout?: string;
        verbose?: boolean;
      }) => {
        const opts = program.opts();
        const config = getConfig({
          apiKey: opts.apiKey,
          apiUrl: opts.apiUrl,
          profile: opts.profile,
        });
        const client = new LarkCIClient(config);

        const verbose = cmdOpts.verbose ?? false;

        let workflowIds: string[] = [];

        if (cmdOpts.all) {
          const workflows = await fetchAllWorkflows(client);
          workflowIds = workflows.map((w) => w.id);
        } else if (cmdOpts.groupId) {
          const workflows = await fetchAllWorkflows(client, {
            group_id: cmdOpts.groupId,
          });
          workflowIds = workflows.map((w) => w.id);
          if (workflowIds.length === 0) {
            console.error(
              `Error: No workflows found in group "${cmdOpts.groupId}".`,
            );
            process.exit(1);
          }
        } else if (cmdOpts.groupName) {
          const group = await findGroupByName(client, cmdOpts.groupName);
          if (!group) {
            console.error(
              `Error: No workflow group found with name "${cmdOpts.groupName}".`,
            );
            process.exit(1);
          }
          const workflows = await fetchAllWorkflows(client, {
            group_id: group.id,
          });
          workflowIds = workflows.map((w) => w.id);
          if (workflowIds.length === 0) {
            console.error(
              `Error: No workflows found in group "${cmdOpts.groupName}".`,
            );
            process.exit(1);
          }
        } else if (cmdOpts.workflowIds) {
          workflowIds = cmdOpts.workflowIds;
        } else {
          console.error(
            "Error: No workflow IDs provided. Use --workflow-ids, --group-id, --group-name, or --all to specify workflows.",
          );
          process.exit(1);
        }

        try {
          const timeoutSeconds = cmdOpts.timeout
            ? parseInt(cmdOpts.timeout, 10)
            : DEFAULT_TIMEOUT_SECONDS;

          if (isNaN(timeoutSeconds) || timeoutSeconds <= 0) {
            console.error(
              "Error: --timeout must be a positive number of seconds",
            );
            process.exit(3);
          }

          const workflowExecutionPromises = workflowIds.map((workflowId) =>
            invokeWorkflow(
              client,
              workflowId,
              cmdOpts.wait ?? false,
              timeoutSeconds,
              verbose,
            ),
          );

          let timeoutPromise: Promise<void> | undefined;
          if (cmdOpts.timeout) {
            timeoutPromise = new Promise((resolve) => {
              setTimeout(
                () => {
                  resolve();
                },
                parseInt(cmdOpts.timeout!, 10) * 1000,
              );
            });
          }

          let workflowExecutionResults: PromiseSettledResult<WorkflowExecutionResource>[] =
            [];
          if (timeoutPromise) {
            const result = await Promise.race([
              Promise.allSettled(workflowExecutionPromises),
              timeoutPromise,
            ]);
            if (!result) {
              console.error(
                "Timed out waiting for workflow executions to complete",
              );
              process.exit(2);
            }
            workflowExecutionResults = result;
          } else {
            workflowExecutionResults = await Promise.allSettled(
              workflowExecutionPromises,
            );
          }

          const failedWorkflowIds: string[] = [];
          const cancelledWorkflowIds: string[] = [];
          for (const result of workflowExecutionResults) {
            if (result.status === "fulfilled") {
              if (result.value.status === "success") {
                console.log(
                  `Workflow ${result.value.workflow_id} executed successfully. Execution ID: ${result.value.id}`,
                );
              } else if (result.value.status === "failure") {
                console.error(
                  `Workflow ${result.value.workflow_id} executed with failure. Execution ID: ${result.value.id}. Summary: ${result.value.summary}`,
                );
                failedWorkflowIds.push(result.value.workflow_id);
              } else if (result.value.status === "cancelled") {
                console.error(
                  `Workflow ${result.value.workflow_id} was cancelled. Execution ID: ${result.value.id}`,
                );
                cancelledWorkflowIds.push(result.value.workflow_id);
              }
            } else {
              console.error(`Error: ${result.reason}`);
            }
          }

          if (cancelledWorkflowIds.length > 0) {
            console.error(
              `Workflows cancelled: ${cancelledWorkflowIds.join(", ")}`,
            );
          }

          if (failedWorkflowIds.length > 0) {
            console.error(
              `Workflows finished with status "failure": ${failedWorkflowIds.join(", ")}`,
            );
            process.exit(1);
          }

          if (cancelledWorkflowIds.length > 0) {
            process.exit(1);
          }

          process.exit(0);
        } catch (error) {
          if (error instanceof TimeoutError) {
            console.error(`Error: ${error.message}`);
            process.exit(2);
          }
          const message =
            error instanceof Error ? error.message : String(error);
          console.error(`Error: ${message}`);
          process.exit(3);
        }
      },
    );
}
