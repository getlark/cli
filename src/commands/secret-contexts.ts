import type { Command } from "commander";
import { LarkCIClient } from "../api/client.js";
import { getConfig } from "../config.js";

export function registerSecretContextsCommand(
  program: Command,
): void {
  const secrets = program
    .command("secret-contexts")
    .description("Manage secret contexts for storing credentials");

  secrets
    .command("list")
    .description("List all secret contexts")
    .action(async () => {
      const opts = program.opts();
      const config = getConfig({
        apiKey: opts.apiKey,
        apiUrl: opts.apiUrl,
      });
      const client = new LarkCIClient(config);

      try {
        const response = await client.listSecretContexts();
        console.log(JSON.stringify(response, null, 2));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        console.error(`Error: ${message}`);
        process.exit(1);
      }
    });

  secrets
    .command("get")
    .description("Get a secret context (shows key names, not values)")
    .argument("<context>", "The name of the secret context")
    .action(async (context: string) => {
      const opts = program.opts();
      const config = getConfig({
        apiKey: opts.apiKey,
        apiUrl: opts.apiUrl,
      });
      const client = new LarkCIClient(config);

      try {
        const response = await client.getSecretContext(context);
        console.log(JSON.stringify(response, null, 2));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        console.error(`Error: ${message}`);
        process.exit(1);
      }
    });

  secrets
    .command("create")
    .description("Create or replace a secret context with key-value pairs")
    .requiredOption("--context <name>", "Name of the secret context")
    .requiredOption(
      "--secret <key=value...>",
      "Secret key-value pairs (e.g. --secret username=admin --secret password=s3cret)",
      (val: string, acc: string[]) => {
        acc.push(val);
        return acc;
      },
      [] as string[],
    )
    .action(
      async (cmdOpts: { context: string; secret: string[] }) => {
        const opts = program.opts();
        const config = getConfig({
          apiKey: opts.apiKey,
          apiUrl: opts.apiUrl,
        });
        const client = new LarkCIClient(config);

        const value: Record<string, string> = {};
        for (const pair of cmdOpts.secret) {
          const eqIndex = pair.indexOf("=");
          if (eqIndex === -1) {
            console.error(
              `Error: Invalid secret format "${pair}". Expected key=value.`,
            );
            process.exit(1);
          }
          value[pair.slice(0, eqIndex)] = pair.slice(eqIndex + 1);
        }

        try {
          await client.createSecretContext({
            context: cmdOpts.context,
            value,
          });
          console.log(
            `Secret context "${cmdOpts.context}" created successfully.`,
          );
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          console.error(`Error: ${message}`);
          process.exit(1);
        }
      },
    );
}
