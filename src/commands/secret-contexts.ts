import type { Command } from "commander";
import { GetLarkClient } from "../api/client.js";
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
        profile: opts.profile,
      });
      const client = new GetLarkClient(config);

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
        profile: opts.profile,
      });
      const client = new GetLarkClient(config);

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
          profile: opts.profile,
        });
        const client = new GetLarkClient(config);

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

  secrets
    .command("update")
    .description("Update or add a key-value pair in an existing secret context")
    .argument("<context>", "The name of the secret context")
    .requiredOption("--key <key>", "The key to create or update")
    .requiredOption("--value <value>", "The new value for the key")
    .action(
      async (
        context: string,
        cmdOpts: { key: string; value: string },
      ) => {
        const opts = program.opts();
        const config = getConfig({
          apiKey: opts.apiKey,
          apiUrl: opts.apiUrl,
          profile: opts.profile,
        });
        const client = new GetLarkClient(config);

        try {
          await client.updateSecretContext(
            context,
            cmdOpts.key,
            cmdOpts.value,
          );
          console.log(
            `Secret context "${context}" key "${cmdOpts.key}" updated successfully.`,
          );
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          console.error(`Error: ${message}`);
          process.exit(1);
        }
      },
    );

  secrets
    .command("delete")
    .description("Delete a secret context")
    .argument("<context>", "The name of the secret context to delete")
    .action(async (context: string) => {
      const opts = program.opts();
      const config = getConfig({
        apiKey: opts.apiKey,
        apiUrl: opts.apiUrl,
        profile: opts.profile,
      });
      const client = new GetLarkClient(config);

      try {
        await client.deleteSecretContext(context);
        console.log(`Secret context "${context}" deleted successfully.`);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        console.error(`Error: ${message}`);
        process.exit(1);
      }
    });

  secrets
    .command("delete-key")
    .description("Delete a single key from a secret context")
    .argument("<context>", "The name of the secret context")
    .argument("<key>", "The key to delete")
    .action(async (context: string, key: string) => {
      const opts = program.opts();
      const config = getConfig({
        apiKey: opts.apiKey,
        apiUrl: opts.apiUrl,
        profile: opts.profile,
      });
      const client = new GetLarkClient(config);

      try {
        await client.deleteSecretContextKey(context, key);
        console.log(
          `Key "${key}" deleted from secret context "${context}" successfully.`,
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        console.error(`Error: ${message}`);
        process.exit(1);
      }
    });
}
