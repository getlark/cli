import type { Command } from "commander";
import {
  CONFIG_PATH,
  maskApiKey,
  readConfigFile,
  setCurrentProfile,
} from "../profile.js";

export function registerConfigCommand(program: Command): void {
  const config = program
    .command("config")
    .description("Manage CLI configuration profiles");

  config
    .command("list")
    .description("List configured profiles")
    .action(() => {
      const file = readConfigFile();
      if (!file || Object.keys(file.profiles).length === 0) {
        console.log(`No profiles configured. Run \`getlark login\` to add one.`);
        console.log(`Config file: ${CONFIG_PATH}`);
        return;
      }

      const rows = Object.entries(file.profiles).map(([name, data]) => ({
        current: name === file.current_profile ? "*" : " ",
        name,
        apiUrl: data.api_url ?? "(default)",
        apiKey: maskApiKey(data.api_key),
      }));

      const nameWidth = Math.max(4, ...rows.map((r) => r.name.length));
      const urlWidth = Math.max(7, ...rows.map((r) => r.apiUrl.length));

      console.log(
        `  ${"NAME".padEnd(nameWidth)}  ${"API URL".padEnd(urlWidth)}  API KEY`,
      );
      for (const row of rows) {
        console.log(
          `${row.current} ${row.name.padEnd(nameWidth)}  ${row.apiUrl.padEnd(urlWidth)}  ${row.apiKey}`,
        );
      }
    });

  config
    .command("use <profile>")
    .description("Set the active profile")
    .action((profile: string) => {
      const ok = setCurrentProfile(profile);
      if (!ok) {
        console.error(
          `Error: Profile "${profile}" not found. Run \`getlark config list\` to see available profiles.`,
        );
        process.exit(1);
      }
      console.log(`Active profile is now "${profile}".`);
    });
}
