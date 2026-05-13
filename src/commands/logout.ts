import type { Command } from "commander";
import { CONFIG_PATH, readConfigFile, removeProfile } from "../profile.js";

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

      const resolveProfileName = (): string => {
        if (opts.profile) {
          return opts.profile;
        }
        if (
          file.current_profile &&
          file.profiles[file.current_profile]
        ) {
          return file.current_profile;
        }
        const names = Object.keys(file.profiles);
        if (names.length === 1) {
          return names[0];
        }
        const available =
          names.length === 0
            ? "No profiles are configured."
            : `Available profiles: ${names.map((n) => `"${n}"`).join(", ")}.`;
        console.error(
          `Error: No profile specified. Pass --profile <name>. ${available}`,
        );
        process.exit(1);
      };

      const profileName = resolveProfileName();

      const removed = removeProfile(profileName);
      if (!removed) {
        console.error(
          `Error: Profile "${profileName}" not found. Run \`larkci config list\` to see available profiles.`,
        );
        process.exit(1);
      }

      console.log(`Removed profile "${profileName}".`);
    });
}
