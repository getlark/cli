import type { Command } from "commander";
import {
  CONFIG_PATH,
  DEFAULT_PROFILE_NAME,
  readConfigFile,
  removeProfile,
} from "../profile.js";

export function registerLogoutCommand(program: Command): void {
  program
    .command("logout")
    .description("Remove a profile from ~/.getlark/config.json")
    .action(() => {
      const opts = program.opts();
      const file = readConfigFile();
      if (!file) {
        console.log(`No config file at ${CONFIG_PATH}. Nothing to do.`);
        return;
      }

      const profileName: string =
        opts.profile ?? file.current_profile ?? DEFAULT_PROFILE_NAME;

      const removed = removeProfile(profileName);
      if (!removed) {
        console.error(
          `Error: Profile "${profileName}" not found in ${CONFIG_PATH}.`,
        );
        process.exit(1);
      }

      console.log(`Removed profile "${profileName}".`);
    });
}
