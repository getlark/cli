import type { Command } from "commander";
import { LarkCIClient } from "../api/client.js";
import { getConfig } from "../config.js";

export function registerArchiveWorkflowCommands(
  workflows: Command,
  program: Command,
): void {
  workflows
    .command("archive")
    .description("Archive a workflow")
    .argument("<workflow_id>", "The ID of the workflow to archive")
    .action(async (workflowId: string) => {
      const opts = program.opts();
      const config = getConfig({
        apiKey: opts.apiKey,
        apiUrl: opts.apiUrl,
        profile: opts.profile,
      });
      const client = new LarkCIClient(config);

      try {
        const workflow = await client.archiveWorkflow(workflowId);
        console.log(JSON.stringify(workflow, null, 2));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        console.error(`Error: ${message}`);
        process.exit(1);
      }
    });

  workflows
    .command("unarchive")
    .description("Unarchive a workflow")
    .argument("<workflow_id>", "The ID of the workflow to unarchive")
    .action(async (workflowId: string) => {
      const opts = program.opts();
      const config = getConfig({
        apiKey: opts.apiKey,
        apiUrl: opts.apiUrl,
        profile: opts.profile,
      });
      const client = new LarkCIClient(config);

      try {
        const workflow = await client.unarchiveWorkflow(workflowId);
        console.log(JSON.stringify(workflow, null, 2));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        console.error(`Error: ${message}`);
        process.exit(1);
      }
    });
}
