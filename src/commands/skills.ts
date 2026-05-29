import { spawn } from "node:child_process";
import type { Command } from "commander";

const SKILLS_PACKAGE = "getlark/skills";

export function registerSkillsCommand(program: Command): void {
  const skills = program
    .command("skills")
    .description(
      "Install Lark Agent Skills (Claude Code plugin, Cursor, Codex, etc.)",
    );

  skills
    .command("install")
    .description(
      `Install the Lark skills into the current project via \`npx skills add ${SKILLS_PACKAGE}\`. Works with Claude Code, Cursor, Codex, OpenCode, Windsurf, Gemini CLI, and Copilot.`,
    )
    .action(() => {
      const cmdArgs = ["-y", "skills", "add", SKILLS_PACKAGE];

      const child = spawn("npx", cmdArgs, {
        stdio: "inherit",
        shell: false,
      });

      child.on("error", (err) => {
        const message = err instanceof Error ? err.message : String(err);
        console.error(
          `Error: Failed to run \`npx ${cmdArgs.join(" ")}\`: ${message}`,
        );
        console.error(
          "Make sure Node.js (>= 18) and npx are installed and on your PATH.",
        );
        process.exit(1);
      });

      child.on("exit", (code, signal) => {
        if (signal) {
          process.kill(process.pid, signal);
          return;
        }
        process.exit(code ?? 1);
      });
    });
}
