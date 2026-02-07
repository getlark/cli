import type { Command } from "commander";
import { LarkCIClient } from "../api/client.js";
import { getConfig } from "../config.js";

export function registerInvokeCommand(program: Command): void {
  program
    .command("invoke")
    .description("Invoke a workflow and start a new execution")
    .argument("<workflow_id>", "The ID of the workflow to invoke")
    .action(async (workflowId: string) => {
      const opts = program.opts();
      const config = getConfig({
        apiKey: opts.apiKey,
        apiUrl: opts.apiUrl,
      });
      const client = new LarkCIClient(config);

      try {
        const execution = await client.invokeWorkflow(workflowId);
        console.log(JSON.stringify(execution, null, 2));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        console.error(`Error: ${message}`);
        process.exit(1);
      }
    });
}
