import type { Command } from "commander";
import { LarkCIClient } from "../api/client.js";
import { getConfig } from "../config.js";

export function registerRepairsCommand(
  workflows: Command,
  program: Command,
): void {
  const repairs = workflows
    .command("repairs")
    .description("Manage workflow repairs");

  repairs
    .command("trigger")
    .description("Trigger a repair for a workflow")
    .argument("<workflow_id>", "The ID of the workflow")
    .action(async (workflowId: string) => {
      const opts = program.opts();
      const config = getConfig({
        apiKey: opts.apiKey,
        apiUrl: opts.apiUrl,
      });
      const client = new LarkCIClient(config);

      try {
        const result = await client.repairWorkflow(workflowId);
        console.log(JSON.stringify(result, null, 2));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        console.error(`Error: ${message}`);
        process.exit(1);
      }
    });

  repairs
    .command("list")
    .description("List repairs for a workflow")
    .argument("<workflow_id>", "The ID of the workflow")
    .option(
      "--limit <number>",
      "Max number of repairs to return (1-100)",
      "10",
    )
    .option("--offset <number>", "Number of repairs to skip", "0")
    .action(
      async (
        workflowId: string,
        cmdOpts: { limit: string; offset: string },
      ) => {
        const opts = program.opts();
        const config = getConfig({
          apiKey: opts.apiKey,
          apiUrl: opts.apiUrl,
        });
        const client = new LarkCIClient(config);

        try {
          const result = await client.listWorkflowRepairs(workflowId, {
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
      },
    );

  repairs
    .command("get")
    .description("Get details of a specific workflow repair")
    .argument("<workflow_id>", "The ID of the workflow")
    .argument("<repair_id>", "The ID of the repair")
    .action(async (workflowId: string, repairId: string) => {
      const opts = program.opts();
      const config = getConfig({
        apiKey: opts.apiKey,
        apiUrl: opts.apiUrl,
      });
      const client = new LarkCIClient(config);

      try {
        const result = await client.getWorkflowRepair(workflowId, repairId);
        console.log(JSON.stringify(result, null, 2));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        console.error(`Error: ${message}`);
        process.exit(1);
      }
    });

  repairs
    .command("cancel")
    .description("Cancel a running workflow repair")
    .argument("<workflow_id>", "The ID of the workflow")
    .argument("<repair_id>", "The ID of the repair")
    .action(async (workflowId: string, repairId: string) => {
      const opts = program.opts();
      const config = getConfig({
        apiKey: opts.apiKey,
        apiUrl: opts.apiUrl,
      });
      const client = new LarkCIClient(config);

      try {
        const result = await client.cancelWorkflowRepair(
          workflowId,
          repairId,
        );
        console.log(JSON.stringify(result, null, 2));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        console.error(`Error: ${message}`);
        process.exit(1);
      }
    });

  repairs
    .command("logs")
    .description("Get logs for a specific workflow repair")
    .argument("<workflow_id>", "The ID of the workflow")
    .argument("<repair_id>", "The ID of the repair")
    .action(async (workflowId: string, repairId: string) => {
      const opts = program.opts();
      const config = getConfig({
        apiKey: opts.apiKey,
        apiUrl: opts.apiUrl,
      });
      const client = new LarkCIClient(config);

      try {
        const logs = await client.getWorkflowRepairLogs(
          workflowId,
          repairId,
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
}
