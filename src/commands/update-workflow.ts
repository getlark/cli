import type { Command } from "commander";
import { LarkCIClient } from "../api/client.js";
import { getConfig } from "../config.js";

export function registerUpdateWorkflowCommand(
  workflows: Command,
  program: Command,
): void {
  workflows
    .command("update")
    .description("Update a workflow's name, description, secret contexts, schedule, or group")
    .argument("<workflow_id>", "The ID of the workflow to update")
    .option("--name <name>", "New name for the workflow")
    .option("--description <description>", "New description for the workflow")
    .option(
      "--secret-contexts <contexts...>",
      "Secret contexts to attach to the workflow",
    )
    .option("--schedule <cron>", "Cron schedule for the workflow")
    .option("--group-id <groupId>", "Workflow group ID (use 'null' to ungroup)")
    .action(
      async (
        workflowId: string,
        cmdOpts: {
          name?: string;
          description?: string;
          secretContexts?: string[];
          schedule?: string;
          groupId?: string;
        },
      ) => {
        const opts = program.opts();
        const config = getConfig({
          apiKey: opts.apiKey,
          apiUrl: opts.apiUrl,
          profile: opts.profile,
        });
        const client = new LarkCIClient(config);

        const updatePayload: Record<string, unknown> = {};
        if (cmdOpts.name !== undefined) updatePayload.name = cmdOpts.name;
        if (cmdOpts.description !== undefined)
          updatePayload.description = cmdOpts.description;
        if (cmdOpts.secretContexts !== undefined)
          updatePayload.secret_contexts = cmdOpts.secretContexts;
        if (cmdOpts.schedule !== undefined)
          updatePayload.schedule =
            cmdOpts.schedule === "null" ? null : cmdOpts.schedule;
        if (cmdOpts.groupId !== undefined)
          updatePayload.group_id =
            cmdOpts.groupId === "null" ? null : cmdOpts.groupId;

        if (Object.keys(updatePayload).length === 0) {
          console.error(
            "Error: At least one option (--name, --description, --secret-contexts, --schedule, --group-id) is required.",
          );
          process.exit(1);
        }

        try {
          const workflow = await client.updateWorkflow(
            workflowId,
            updatePayload as Parameters<LarkCIClient["updateWorkflow"]>[1],
          );
          console.log(JSON.stringify(workflow, null, 2));
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          console.error(`Error: ${message}`);
          process.exit(1);
        }
      },
    );
}
