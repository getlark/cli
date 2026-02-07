import type { Command } from "commander";
import { LarkCIClient, TimeoutError } from "../api/client.js";
import { getConfig } from "../config.js";

const DEFAULT_TIMEOUT_SECONDS = 600;
const POLL_INTERVAL_MS = 5_000;

function formatElapsed(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m${seconds}s`;
}

export function registerInvokeCommand(
  workflows: Command,
  program: Command
): void {
  workflows
    .command("invoke")
    .description("Invoke a workflow and start a new execution")
    .argument("<workflow_id>", "The ID of the workflow to invoke")
    .option("--wait", "Wait for the execution to reach a terminal status before exiting")
    .option("--timeout <seconds>", "Maximum time to wait in seconds (default: 600, requires --wait)")
    .action(async (workflowId: string, cmdOpts: { wait?: boolean; timeout?: string }) => {
      const opts = program.opts();
      const config = getConfig({
        apiKey: opts.apiKey,
        apiUrl: opts.apiUrl,
      });
      const client = new LarkCIClient(config);

      try {
        const execution = await client.invokeWorkflow(workflowId);

        if (!cmdOpts.wait) {
          console.log(JSON.stringify(execution, null, 2));
          return;
        }

        const timeoutSeconds = cmdOpts.timeout
          ? parseInt(cmdOpts.timeout, 10)
          : DEFAULT_TIMEOUT_SECONDS;

        if (isNaN(timeoutSeconds) || timeoutSeconds <= 0) {
          console.error("Error: --timeout must be a positive number of seconds");
          process.exit(3);
        }

        console.error(`Waiting for execution ${execution.id} (timeout: ${timeoutSeconds}s)...`);

        const finalExecution = await client.pollWorkflowExecution(
          workflowId,
          execution.id,
          {
            timeoutMs: timeoutSeconds * 1000,
            pollIntervalMs: POLL_INTERVAL_MS,
            onPoll: (exec, elapsedMs) => {
              console.error(`  Status: ${exec.status} (${formatElapsed(elapsedMs)} elapsed)`);
            },
          }
        );

        console.log(JSON.stringify(finalExecution, null, 2));

        if (finalExecution.status === "failure") {
          process.exit(1);
        }
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
    });
}
