import type { Command } from "commander";
import { LarkCIClient } from "../api/client.js";
import { getConfig } from "../config.js";

export function registerWorkflowGroupsCommand(
  program: Command,
): void {
  const groups = program
    .command("workflow-groups")
    .description("Manage workflow groups for organizing workflows");

  groups
    .command("list")
    .description("List workflow groups")
    .option(
      "--limit <number>",
      "Max number of groups to return (1-100)",
      "10",
    )
    .option("--offset <number>", "Number of groups to skip", "0")
    .action(async (cmdOpts: { limit: string; offset: string }) => {
      const opts = program.opts();
      const config = getConfig({
        apiKey: opts.apiKey,
        apiUrl: opts.apiUrl,
      });
      const client = new LarkCIClient(config);

      try {
        const result = await client.listWorkflowGroups({
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
    });

  groups
    .command("get")
    .description("Get details of a workflow group")
    .argument("<group_id>", "The ID of the workflow group")
    .action(async (groupId: string) => {
      const opts = program.opts();
      const config = getConfig({
        apiKey: opts.apiKey,
        apiUrl: opts.apiUrl,
      });
      const client = new LarkCIClient(config);

      try {
        const result = await client.getWorkflowGroup(groupId);
        console.log(JSON.stringify(result, null, 2));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        console.error(`Error: ${message}`);
        process.exit(1);
      }
    });

  groups
    .command("create")
    .description("Create a new workflow group")
    .requiredOption("--name <name>", "Name of the workflow group")
    .action(async (cmdOpts: { name: string }) => {
      const opts = program.opts();
      const config = getConfig({
        apiKey: opts.apiKey,
        apiUrl: opts.apiUrl,
      });
      const client = new LarkCIClient(config);

      try {
        const result = await client.createWorkflowGroup({
          name: cmdOpts.name,
        });
        console.log(JSON.stringify(result, null, 2));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        console.error(`Error: ${message}`);
        process.exit(1);
      }
    });

  groups
    .command("update")
    .description("Update a workflow group's name")
    .argument("<group_id>", "The ID of the workflow group")
    .option("--name <name>", "New name for the workflow group")
    .action(async (groupId: string, cmdOpts: { name?: string }) => {
      const opts = program.opts();
      const config = getConfig({
        apiKey: opts.apiKey,
        apiUrl: opts.apiUrl,
      });
      const client = new LarkCIClient(config);

      if (!cmdOpts.name) {
        console.error("Error: --name is required.");
        process.exit(1);
      }

      try {
        const result = await client.updateWorkflowGroup(groupId, {
          name: cmdOpts.name,
        });
        console.log(JSON.stringify(result, null, 2));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        console.error(`Error: ${message}`);
        process.exit(1);
      }
    });

  groups
    .command("delete")
    .description("Delete a workflow group")
    .argument("<group_id>", "The ID of the workflow group to delete")
    .action(async (groupId: string) => {
      const opts = program.opts();
      const config = getConfig({
        apiKey: opts.apiKey,
        apiUrl: opts.apiUrl,
      });
      const client = new LarkCIClient(config);

      try {
        await client.deleteWorkflowGroup(groupId);
        console.log(`Workflow group "${groupId}" deleted successfully.`);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        console.error(`Error: ${message}`);
        process.exit(1);
      }
    });
}
