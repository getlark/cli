import type { Command } from "commander";
import {
  CONFIG_PATH,
  DEFAULT_PROFILE_NAME,
  maskApiKey,
  readConfigFile,
  upsertProfile,
} from "../profile.js";
import { promptSecret } from "../prompt.js";

export function registerLoginCommand(program: Command): void {
  program
    .command("login")
    .description(
      "Save API credentials to ~/.getlark/config.json. Pass --api-key to skip the prompt.",
    )
    .action(async () => {
      const opts = program.opts();
      const profileName: string =
        opts.profile ??
        readConfigFile()?.current_profile ??
        DEFAULT_PROFILE_NAME;

      let apiKey: string | undefined = opts.apiKey;
      if (!apiKey) {
        try {
          apiKey = (
            await promptSecret(`API key for "${profileName}": `)
          ).trim();
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error(message);
          process.exit(1);
        }
      }

      if (!apiKey) {
        console.error("Error: API key cannot be empty.");
        process.exit(1);
      }

      const profileData: { api_key: string; api_url?: string } = {
        api_key: apiKey,
      };
      if (opts.apiUrl) profileData.api_url = opts.apiUrl;

      try {
        upsertProfile(profileName, profileData);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Error: ${message}`);
        process.exit(1);
      }

      console.log(
        `Saved profile "${profileName}" (${maskApiKey(apiKey)}) to ${CONFIG_PATH}`,
      );
    });
}
