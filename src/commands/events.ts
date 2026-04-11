import type { Command } from "commander";
import { LarkCIClient } from "../api/client.js";
import { getConfig } from "../config.js";

export function registerEventsCommand(
  workflows: Command,
  program: Command,
): void {
  const events = workflows
    .command("events")
    .description("Manage workflow events");

  events
    .command("list")
    .description("List events for a workflow")
    .argument("<workflow_id>", "The ID of the workflow")
    .option(
      "--limit <number>",
      "Max number of events to return (1-100)",
      "10",
    )
    .option("--offset <number>", "Number of events to skip", "0")
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
          const result = await client.listWorkflowEvents(workflowId, {
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
}
