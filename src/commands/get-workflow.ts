import type { Command } from "commander";
import { GetLarkClient } from "../api/client.js";
import { getConfig } from "../config.js";

export function registerGetWorkflowCommand(
  workflows: Command,
  program: Command,
): void {
  workflows
    .command("get")
    .description("Get details of a specific workflow")
    .argument("<workflow_id>", "The ID of the workflow")
    .action(async (workflowId: string) => {
      const opts = program.opts();
      const config = getConfig({
        apiKey: opts.apiKey,
        apiUrl: opts.apiUrl,
        profile: opts.profile,
      });
      const client = new GetLarkClient(config);

      try {
        const workflow = await client.getWorkflow(workflowId);
        console.log(JSON.stringify(workflow, null, 2));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        console.error(`Error: ${message}`);
        process.exit(1);
      }
    });
}
