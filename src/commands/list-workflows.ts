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
    .option("--limit <number>", "Max number of workflows to return (1-100)", "10")
    .option("--offset <number>", "Number of workflows to skip", "0")
    .option("--group-id <groupId>", "Filter workflows by group ID")
    .action(async (cmdOpts: { limit: string; offset: string; groupId?: string }) => {
      const opts = program.opts();
      const config = getConfig({
        apiKey: opts.apiKey,
        apiUrl: opts.apiUrl,
      });
      const client = new LarkCIClient(config);

      try {
        const response = await client.listWorkflows({
          limit: parseInt(cmdOpts.limit, 10),
          offset: parseInt(cmdOpts.offset, 10),
          group_id: cmdOpts.groupId,
        });
        const activeWorkflows = response.workflows.filter(
          (workflow) => !workflow.archived_at,
        );
        console.log(
          JSON.stringify(
            { workflows: activeWorkflows, has_more: response.has_more },
            null,
            2,
          ),
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Error: ${message}`);
        process.exit(1);
      }
    });
}
