#!/usr/bin/env node

import { Command, Option } from "commander";
import { registerInvokeCommand } from "./commands/invoke.js";
import { registerExecutionCommand } from "./commands/execution.js";
import { registerListWorkflowsCommand } from "./commands/list-workflows.js";
import { registerCreateWorkflowCommand } from "./commands/create-workflow.js";
import { registerGetWorkflowCommand } from "./commands/get-workflow.js";
import { registerUpdateWorkflowCommand } from "./commands/update-workflow.js";
import { registerArchiveWorkflowCommands } from "./commands/archive-workflow.js";
import { registerRepairsCommand } from "./commands/repairs.js";
import { registerGenerationsCommand } from "./commands/generations.js";
import { registerEventsCommand } from "./commands/events.js";
import { registerSecretContextsCommand } from "./commands/secret-contexts.js";
import { registerWorkflowGroupsCommand } from "./commands/workflow-groups.js";
import { registerLoginCommand } from "./commands/login.js";
import { registerLogoutCommand } from "./commands/logout.js";
import { registerConfigCommand } from "./commands/config.js";

const program = new Command();

program
  .name("larkci")
  .description(
    "LarkCI CLI - Invoke testing workflows and manage test executions",
  )
  .version("0.2.5")
  .addOption(new Option("--api-key <key>", "API key").env("LARKCI_API_KEY"))
  .addOption(
    new Option(
      "--api-url <url>",
      "API base URL (overrides LARKCI_API_URL env var)",
    ).hideHelp(),
  )
  .addOption(
    new Option(
      "--profile <name>",
      "Profile to read from ~/.getlark/config.json",
    ),
  );

const workflows = program.command("workflows").description("Manage workflows");

registerListWorkflowsCommand(workflows, program);
registerGetWorkflowCommand(workflows, program);
registerCreateWorkflowCommand(workflows, program);
registerUpdateWorkflowCommand(workflows, program);
registerArchiveWorkflowCommands(workflows, program);
registerInvokeCommand(workflows, program);
registerExecutionCommand(workflows, program);
registerRepairsCommand(workflows, program);
registerGenerationsCommand(workflows, program);
registerEventsCommand(workflows, program);

registerSecretContextsCommand(program);
registerWorkflowGroupsCommand(program);

registerLoginCommand(program);
registerLogoutCommand(program);
registerConfigCommand(program);

program.parse();
