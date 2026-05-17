import { existsSync, readFileSync } from "node:fs";
import type { Command } from "commander";
import { GetLarkClient } from "../api/client.js";
import { getConfig } from "../config.js";
import type { JobStatus, WorkflowImportInput } from "../api/types.js";

const ALLOWED_STATUSES: readonly JobStatus[] = [
  "pending",
  "running",
  "completed",
  "failed",
  "cancelled",
];

const ALLOWED_TYPES = ["workflow_import"] as const;
type AllowedJobType = (typeof ALLOWED_TYPES)[number];

function collectStatus(value: string, previous: string[] = []): string[] {
  return previous.concat(value);
}

function validateStatuses(values: string[] | undefined): JobStatus[] | undefined {
  if (!values || values.length === 0) return undefined;
  const invalid = values.filter(
    (v) => !ALLOWED_STATUSES.includes(v as JobStatus),
  );
  if (invalid.length > 0) {
    console.error(
      `Error: invalid --status value(s): ${invalid.join(", ")}. Allowed: ${ALLOWED_STATUSES.join(", ")}.`,
    );
    process.exit(1);
  }
  return values as JobStatus[];
}

function validateJobType(value: string): AllowedJobType {
  if (!ALLOWED_TYPES.includes(value as AllowedJobType)) {
    console.error(
      `Error: invalid --type value: ${value}. Allowed: ${ALLOWED_TYPES.join(", ")}.`,
    );
    process.exit(1);
  }
  return value as AllowedJobType;
}

function readJsonFile(path: string): unknown {
  if (!existsSync(path)) {
    console.error(`Error: file not found: ${path}`);
    process.exit(1);
  }
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error: could not read ${path}: ${message}`);
    process.exit(1);
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${path} is not valid JSON: ${message}`);
    process.exit(1);
  }
}

function ensureFileExists(path: string): void {
  if (!existsSync(path)) {
    console.error(`Error: file not found: ${path}`);
    process.exit(1);
  }
}

export function registerJobsCommand(program: Command): void {
  const jobs = program
    .command("jobs")
    .description("Manage long-running jobs (e.g. workflow imports)");

  jobs
    .command("create")
    .description("Create a new job from an inline JSON input file")
    .requiredOption("--name <name>", "Human-readable name for the job")
    .requiredOption(
      "--input-file <path>",
      "Path to a JSON file containing the job input (e.g. { \"workflows\": [...] })",
    )
    .option(
      "--type <type>",
      `Job type (one of: ${ALLOWED_TYPES.join(", ")})`,
      "workflow_import",
    )
    .action(
      async (cmdOpts: { name: string; inputFile: string; type: string }) => {
        const opts = program.opts();
        const config = getConfig({
          apiKey: opts.apiKey,
          apiUrl: opts.apiUrl,
          profile: opts.profile,
        });
        const client = new GetLarkClient(config);

        const type = validateJobType(cmdOpts.type);
        const input = readJsonFile(cmdOpts.inputFile) as WorkflowImportInput;

        try {
          const result = await client.createJob({
            type,
            name: cmdOpts.name,
            input,
          });
          console.log(JSON.stringify(result, null, 2));
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          console.error(`Error: ${message}`);
          process.exit(1);
        }
      },
    );

  jobs
    .command("list")
    .description("List jobs")
    .option("--limit <number>", "Max number of jobs to return (1-100)", "20")
    .option("--offset <number>", "Number of jobs to skip", "0")
    .option(
      "--status <status>",
      `Filter by status; repeat to pass multiple (one of: ${ALLOWED_STATUSES.join(", ")})`,
      collectStatus,
      [] as string[],
    )
    .action(
      async (cmdOpts: {
        limit: string;
        offset: string;
        status: string[];
      }) => {
        const opts = program.opts();
        const config = getConfig({
          apiKey: opts.apiKey,
          apiUrl: opts.apiUrl,
          profile: opts.profile,
        });
        const client = new GetLarkClient(config);

        const statuses = validateStatuses(cmdOpts.status);

        try {
          const result = await client.listJobs({
            limit: parseInt(cmdOpts.limit, 10),
            offset: parseInt(cmdOpts.offset, 10),
            status: statuses,
          });
          console.log(JSON.stringify(result, null, 2));
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          console.error(`Error: ${message}`);
          process.exit(1);
        }
      },
    );

  jobs
    .command("get")
    .description("Get details of a specific job")
    .argument("<job_id>", "The ID of the job")
    .action(async (jobId: string) => {
      const opts = program.opts();
      const config = getConfig({
        apiKey: opts.apiKey,
        apiUrl: opts.apiUrl,
        profile: opts.profile,
      });
      const client = new GetLarkClient(config);

      try {
        const result = await client.getJob(jobId);
        console.log(JSON.stringify(result, null, 2));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        console.error(`Error: ${message}`);
        process.exit(1);
      }
    });

  jobs
    .command("cancel")
    .description("Cancel a running or pending job")
    .argument("<job_id>", "The ID of the job")
    .action(async (jobId: string) => {
      const opts = program.opts();
      const config = getConfig({
        apiKey: opts.apiKey,
        apiUrl: opts.apiUrl,
        profile: opts.profile,
      });
      const client = new GetLarkClient(config);

      try {
        const result = await client.cancelJob(jobId);
        console.log(JSON.stringify(result, null, 2));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        console.error(`Error: ${message}`);
        process.exit(1);
      }
    });

  jobs
    .command("upload")
    .description(
      "Create a new job by uploading an input file (multipart/form-data)",
    )
    .requiredOption("--name <name>", "Human-readable name for the job")
    .requiredOption("--file <path>", "Path to the input file to upload")
    .option(
      "--type <type>",
      `Job type (one of: ${ALLOWED_TYPES.join(", ")})`,
      "workflow_import",
    )
    .action(
      async (cmdOpts: { name: string; file: string; type: string }) => {
        const opts = program.opts();
        const config = getConfig({
          apiKey: opts.apiKey,
          apiUrl: opts.apiUrl,
          profile: opts.profile,
        });
        const client = new GetLarkClient(config);

        const type = validateJobType(cmdOpts.type);
        ensureFileExists(cmdOpts.file);

        try {
          const result = await client.uploadJob({
            type,
            name: cmdOpts.name,
            filePath: cmdOpts.file,
          });
          console.log(JSON.stringify(result, null, 2));
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          console.error(`Error: ${message}`);
          process.exit(1);
        }
      },
    );

  jobs
    .command("validate")
    .description(
      "Validate an input file without creating a job (multipart/form-data)",
    )
    .requiredOption("--file <path>", "Path to the input file to validate")
    .option(
      "--type <type>",
      `Job type (one of: ${ALLOWED_TYPES.join(", ")})`,
      "workflow_import",
    )
    .action(async (cmdOpts: { file: string; type: string }) => {
      const opts = program.opts();
      const config = getConfig({
        apiKey: opts.apiKey,
        apiUrl: opts.apiUrl,
        profile: opts.profile,
      });
      const client = new GetLarkClient(config);

      const type = validateJobType(cmdOpts.type);
      ensureFileExists(cmdOpts.file);

      try {
        const result = await client.validateUploadJob({
          type,
          filePath: cmdOpts.file,
        });
        console.log(JSON.stringify(result, null, 2));
        if (!result.valid) process.exit(1);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        console.error(`Error: ${message}`);
        process.exit(1);
      }
    });
}
