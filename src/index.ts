#!/usr/bin/env node

import { Command, Option } from "commander";
import { registerInvokeCommand } from "./commands/invoke.js";
import { registerExecutionCommand } from "./commands/execution.js";
import { registerListWorkflowsCommand } from "./commands/list-workflows.js";
import { registerCreateWorkflowCommand } from "./commands/create-workflow.js";
import { registerSecretContextsCommand } from "./commands/secret-contexts.js";

const program = new Command();

program
  .name("larkci")
  .description(
    "LarkCI CLI - Invoke testing workflows and manage test executions",
  )
  .version("0.2.0")
  .addOption(new Option("--api-key <key>", "API key").env("LARKCI_API_KEY"))
  .addOption(
    new Option(
      "--api-url <url>",
      "API base URL (overrides LARKCI_API_URL env var)",
    ).hideHelp(),
  );

const workflows = program.command("workflows").description("Manage workflows");

registerListWorkflowsCommand(workflows, program);
registerCreateWorkflowCommand(workflows, program);
registerInvokeCommand(workflows, program);
registerExecutionCommand(workflows, program);

registerSecretContextsCommand(program);

program.parse();
