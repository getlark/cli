import type { Command } from "commander";
import { LarkCIClient } from "../api/client.js";
import { getConfig } from "../config.js";

export function registerGenerationsCommand(
  workflows: Command,
  program: Command,
): void {
  const generations = workflows
    .command("generations")
    .description("Manage workflow generations");

  generations
    .command("cancel")
    .description("Cancel a running workflow generation")
    .argument("<workflow_id>", "The ID of the workflow")
    .argument("<generation_id>", "The ID of the generation")
    .action(async (workflowId: string, generationId: string) => {
      const opts = program.opts();
      const config = getConfig({
        apiKey: opts.apiKey,
        apiUrl: opts.apiUrl,
      });
      const client = new LarkCIClient(config);

      try {
        const result = await client.cancelWorkflowGeneration(
          workflowId,
          generationId,
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
