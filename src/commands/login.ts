import type { Command } from "commander";
import {
  type ConfigFileData,
  CONFIG_PATH,
  DEFAULT_PROFILE_NAME,
  maskApiKey,
  readConfigFile,
  writeConfigFile,
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

      // login is the recovery path for a broken config — fall back to a fresh
      // file rather than crashing if the existing one is unreadable.
      let existing: ConfigFileData | null = null;
      try {
        existing = readConfigFile();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`Warning: ${message} It will be overwritten.`);
      }

      const profileName: string =
        opts.profile || existing?.current_profile || DEFAULT_PROFILE_NAME;

      // Only treat --api-key as user-supplied if it came from the CLI flag.
      // The global option also reads GETLARK_API_KEY via .env(), but env-supplied
      // values shouldn't silently skip the interactive prompt.
      const apiKeyFromFlag =
        program.getOptionValueSource("apiKey") === "cli"
          ? (opts.apiKey as string | undefined)
          : undefined;

      let apiKey: string | undefined = apiKeyFromFlag;
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

      const file: ConfigFileData = existing ?? {
        current_profile: profileName,
        profiles: {},
      };
      file.profiles[profileName] = profileData;
      if (!file.current_profile) file.current_profile = profileName;

      try {
        writeConfigFile(file);
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
