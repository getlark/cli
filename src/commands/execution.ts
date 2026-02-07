import type { Command } from "commander";
import { LarkCIClient } from "../api/client.js";
import { getConfig } from "../config.js";

export function registerExecutionCommand(program: Command): void {
  const execution = program
    .command("execution")
    .description("Manage workflow executions");

  execution
    .command("get")
    .description("Get details of a specific workflow execution")
    .argument("<workflow_id>", "The ID of the workflow")
    .argument("<execution_id>", "The ID of the execution")
    .action(async (workflowId: string, executionId: string) => {
      const opts = program.opts();
      const config = getConfig({
        apiKey: opts.apiKey,
        apiUrl: opts.apiUrl,
      });
      const client = new LarkCIClient(config);

      try {
        const result = await client.getWorkflowExecution(
          workflowId,
          executionId
        );
        console.log(JSON.stringify(result, null, 2));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        console.error(`Error: ${message}`);
        process.exit(1);
      }
    });
}
