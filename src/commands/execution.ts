import type { Command } from "commander";
import { LarkCIClient } from "../api/client.js";
import { getConfig } from "../config.js";

export function registerExecutionCommand(
  workflows: Command,
  program: Command
): void {
  const executions = workflows
    .command("executions")
    .description("Manage workflow executions");

  executions
    .command("list")
    .description("List executions for a workflow")
    .argument("<workflow_id>", "The ID of the workflow")
    .option("--limit <number>", "Max number of executions to return (1-100)", "10")
    .option("--offset <number>", "Number of executions to skip", "0")
    .action(async (workflowId: string, cmdOpts: { limit: string; offset: string }) => {
      const opts = program.opts();
      const config = getConfig({
        apiKey: opts.apiKey,
        apiUrl: opts.apiUrl,
      });
      const client = new LarkCIClient(config);

      try {
        const result = await client.listWorkflowExecutions(workflowId, {
          limit: parseInt(cmdOpts.limit, 10),
          offset: parseInt(cmdOpts.offset, 10),
        });
        console.log(JSON.stringify(result, null, 2));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        console.error(`Error: ${message}`);
        process.exit(1);
      }
    });

  executions
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

  executions
    .command("logs")
    .description("Get logs for a specific workflow execution")
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
        const logs = await client.getWorkflowExecutionLogs(
          workflowId,
          executionId
        );
        for (const line of logs) {
          console.log(line);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        console.error(`Error: ${message}`);
        process.exit(1);
      }
    });

  executions
    .command("cancel")
    .description("Cancel a running workflow execution")
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
        const result = await client.cancelWorkflowExecution(
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
