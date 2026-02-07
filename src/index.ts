#!/usr/bin/env node

import { Command } from "commander";
import { registerInvokeCommand } from "./commands/invoke.js";
import { registerExecutionCommand } from "./commands/execution.js";

const program = new Command();

program
  .name("larkci")
  .description("LarkCI CLI - Invoke testing workflows and manage test executions")
  .version("0.1.0")
  .option("--api-key <key>", "API key (overrides LARKCI_API_KEY env var)")
  .option("--api-url <url>", "API base URL (overrides LARKCI_API_URL env var)");

const workflows = program
  .command("workflows")
  .description("Manage workflows");

registerInvokeCommand(workflows, program);
registerExecutionCommand(workflows, program);

program.parse();
