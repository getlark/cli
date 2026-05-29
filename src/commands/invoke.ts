import { Option, type Command } from "commander";
import { GetLarkClient, TimeoutError } from "../api/client.js";
import { getConfig } from "../config.js";
import type {
  WorkflowResource,
  WorkflowGroupResource,
} from "../api/types.js";

/**
 * The resolved result of invoking a single workflow, including the verdict of
 * the auto-repair chain when a failed execution was given the chance to heal.
 */
interface WorkflowOutcome {
  workflowId: string;
  executionId: string;
  result: "pending" | "running" | "success" | "failure" | "cancelled";
  /** The execution failed but was auto-repaired and passed on re-run. */
  repaired: boolean;
  /** Summarization classified the failure as a genuine app defect. */
  appIssue: boolean;
  summary: string | null;
}

const PAGE_SIZE = 100;

async function fetchAllWorkflows(
  client: GetLarkClient,
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
  client: GetLarkClient,
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
  client: GetLarkClient,
  workflowId: string,
  wait: boolean,
  timeoutSeconds: number,
  verbose: boolean,
  autoRepairEnabled: boolean,
): Promise<WorkflowOutcome> {
  const execution = await client.invokeWorkflow(workflowId);
  if (!wait) {
    return {
      workflowId,
      executionId: execution.id,
      result: execution.status,
      repaired: false,
      appIssue: false,
      summary: execution.summary,
    };
  }

  // A single deadline covers the whole wait — the execution plus, if it fails,
  // the auto-repair chain that may follow.
  const deadline = Date.now() + timeoutSeconds * 1000;
  let logOffset = 0;

  const finalExecution = await client.pollWorkflowExecution(
    workflowId,
    execution.id,
    {
      timeoutMs: deadline - Date.now(),
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

  const outcome: WorkflowOutcome = {
    workflowId,
    executionId: finalExecution.id,
    result: finalExecution.status,
    repaired: false,
    appIssue: false,
    summary: finalExecution.summary,
  };

  if (finalExecution.status !== "failure") {
    return outcome;
  }

  // The execution failed. Unless the account has auto-repair enabled, a failure
  // is final — preserve the original fail-fast behavior.
  if (!autoRepairEnabled) {
    return outcome;
  }

  // Auto-repair only applies to deterministic workflows, so fail immediately
  // for AI-driven ones rather than waiting for a repair that never comes.
  const workflow = await client.getWorkflow(workflowId);
  if (workflow.mode !== "deterministic") {
    return outcome;
  }

  // If execution polling already consumed the deadline, treat the failure as
  // final rather than entering the repair chain only to time out immediately.
  const remainingMs = deadline - Date.now();
  if (remainingMs <= 0) {
    return outcome;
  }

  if (verbose) {
    logForWorkflow(
      workflowId,
      "Execution failed; waiting for summarization/auto-repair to settle...",
    );
  }

  const verdict = await client.pollWorkflowRepairChain(
    workflowId,
    finalExecution,
    {
      timeoutMs: remainingMs,
      pollIntervalMs: POLL_INTERVAL_MS,
      onPoll: (stage, elapsedMs) => {
        if (!verbose) {
          return;
        }
        logForWorkflow(
          workflowId,
          "Repair stage: %s (%s elapsed)",
          stage,
          formatElapsed(elapsedMs),
        );
      },
    },
  );

  return {
    workflowId,
    executionId: verdict.executionId,
    result: verdict.result,
    repaired: verdict.result === "success",
    appIssue: verdict.reason === "app_issue",
    summary: verdict.summary ?? finalExecution.summary,
  };
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
      "\nRun all workflows and wait for completion:\n$ getlark workflows invoke --all --wait",
    )
    .addHelpText(
      "after",
      "\nRun a specific workflow and wait for completion:\n$ getlark workflows invoke --workflow-ids wf_abc123 --wait",
    )
    .addHelpText(
      "after",
      "\nRun all workflows in a group:\n$ getlark workflows invoke --group-id wfl_grp_abc123 --wait",
    )
    .addHelpText(
      "after",
      '\nRun all workflows in a group by name:\n$ getlark workflows invoke --group-name "Checkout Flow" --wait',
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
        const client = new GetLarkClient(config);

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

          // When waiting, a failed execution may be auto-repaired before it
          // counts as a real failure. Check the account setting once up front;
          // if it can't be read, fall back to fail-fast behavior.
          let autoRepairEnabled = false;
          if (cmdOpts.wait) {
            try {
              const settings = await client.getSettings();
              autoRepairEnabled =
                settings.auto_repair_deterministic_workflows_enabled;
            } catch (err) {
              if (verbose) {
                const message =
                  err instanceof Error ? err.message : String(err);
                console.error(
                  `Warning: could not read settings (${message}); treating failures as final.`,
                );
              }
            }
          }

          const workflowExecutionPromises = workflowIds.map((workflowId) =>
            invokeWorkflow(
              client,
              workflowId,
              cmdOpts.wait ?? false,
              timeoutSeconds,
              verbose,
              autoRepairEnabled,
            ),
          );

          // The per-execution deadline inside invokeWorkflow is authoritative
          // and throws TimeoutError regardless of whether --timeout was passed,
          // so there's no need for an outer race here.
          const workflowExecutionResults = await Promise.allSettled(
            workflowExecutionPromises,
          );

          const failedWorkflowIds: string[] = [];
          const cancelledWorkflowIds: string[] = [];
          let timedOut = false;
          let unexpectedError = false;
          for (const result of workflowExecutionResults) {
            if (result.status === "fulfilled") {
              const outcome = result.value;
              if (outcome.result === "success") {
                if (outcome.repaired) {
                  console.log(
                    `Workflow ${outcome.workflowId} failed but was auto-repaired and passed on re-run. Execution ID: ${outcome.executionId}`,
                  );
                } else {
                  console.log(
                    `Workflow ${outcome.workflowId} executed successfully. Execution ID: ${outcome.executionId}`,
                  );
                }
              } else if (outcome.result === "failure") {
                const label = outcome.appIssue
                  ? "executed with failure (app issue)"
                  : "executed with failure";
                console.error(
                  `Workflow ${outcome.workflowId} ${label}. Execution ID: ${outcome.executionId}. Summary: ${outcome.summary}`,
                );
                failedWorkflowIds.push(outcome.workflowId);
              } else if (outcome.result === "cancelled") {
                console.error(
                  `Workflow ${outcome.workflowId} was cancelled. Execution ID: ${outcome.executionId}`,
                );
                cancelledWorkflowIds.push(outcome.workflowId);
              }
            } else {
              if (result.reason instanceof TimeoutError) {
                timedOut = true;
              } else {
                unexpectedError = true;
              }
              console.error(`Error: ${result.reason}`);
            }
          }

          // A timeout takes priority over other outcomes: the documented
          // contract is exit code 2, and without this a timed-out --wait run
          // would otherwise fall through to exit 0.
          if (timedOut) {
            process.exit(2);
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

          // A non-timeout rejection is an unexpected error; don't let it pass
          // silently as success.
          if (unexpectedError) {
            process.exit(3);
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
