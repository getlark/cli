import { Option, type Command } from "commander";
import { LarkCIClient } from "../api/client.js";
import { getConfig } from "../config.js";

export function registerCreateWorkflowCommand(
  workflows: Command,
  program: Command,
): void {
  workflows
    .command("create")
    .description("Create a new workflow")
    .requiredOption("--name <name>", "Name of the workflow")
    .requiredOption("--description <description>", "Description of the workflow")
    .addOption(
      new Option("--mode <mode>", "Execution mode")
        .choices(["ai_driven", "deterministic"])
        .default("ai_driven"),
    )
    .option(
      "--secret-contexts <contexts...>",
      "Secret contexts to attach to the workflow",
    )
    .option("--group-id <groupId>", "Workflow group ID to assign this workflow to")
    .action(
      async (cmdOpts: {
        name: string;
        description: string;
        mode: "ai_driven" | "deterministic";
        secretContexts?: string[];
        groupId?: string;
      }) => {
        const opts = program.opts();
        const config = getConfig({
          apiKey: opts.apiKey,
          apiUrl: opts.apiUrl,
          profile: opts.profile,
        });
        const client = new LarkCIClient(config);

        try {
          const workflow = await client.createWorkflow({
            name: cmdOpts.name,
            description: cmdOpts.description,
            mode: cmdOpts.mode,
            secret_contexts: cmdOpts.secretContexts,
            group_id: cmdOpts.groupId,
          });
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
