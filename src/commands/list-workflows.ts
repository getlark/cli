import type { Command } from "commander";
import { LarkCIClient } from "../api/client.js";
import { getConfig } from "../config.js";

export function registerListWorkflowsCommand(
  workflows: Command,
  program: Command,
): void {
  workflows
    .command("list")
    .description("List non-archived workflows")
    .action(async () => {
      const opts = program.opts();
      const config = getConfig({
        apiKey: opts.apiKey,
        apiUrl: opts.apiUrl,
      });
      const client = new LarkCIClient(config);

      try {
        let workflows = await client.listWorkflows();
        workflows = workflows.filter((workflow) => !workflow.archived_at);
        console.log(JSON.stringify(workflows, null, 2));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Error: ${message}`);
        process.exit(1);
      }
    });
}
