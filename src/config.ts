import dotenv from "dotenv";
import { CONFIG_PATH, getProfile } from "./profile.js";

dotenv.config();

export interface Config {
  apiKey: string;
  apiUrl: string;
}

const DEFAULT_API_URL = "https://api.getlark.ai";

export function getConfig(options: {
  apiKey?: string;
  apiUrl?: string;
  profile?: string;
}): Config {
  let fileApiKey: string | undefined;
  let fileApiUrl: string | undefined;
  try {
    const profile = getProfile(options.profile);
    if (profile) {
      fileApiKey = profile.data.api_key;
      fileApiUrl = profile.data.api_url;
    } else if (options.profile) {
      console.error(
        `Error: Profile "${options.profile}" not found. Run \`larkci config list\` to see available profiles.`,
      );
      process.exit(1);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${message}`);
    process.exit(1);
  }

  const apiKey =
    options.apiKey ?? process.env.LARKCI_API_KEY ?? fileApiKey;
  const apiUrl =
    options.apiUrl ??
    process.env.LARKCI_API_URL ??
    fileApiUrl ??
    DEFAULT_API_URL;

  if (options.profile) {
    const envKey = process.env.LARKCI_API_KEY;
    if (envKey && fileApiKey && envKey !== fileApiKey) {
      console.error(
        `Warning: --profile "${options.profile}" was specified, but LARKCI_API_KEY is set in your environment and takes precedence. Unset LARKCI_API_KEY to use the profile's API key.`,
      );
    }
    const envUrl = process.env.LARKCI_API_URL;
    if (envUrl && fileApiUrl && envUrl !== fileApiUrl) {
      console.error(
        `Warning: --profile "${options.profile}" was specified, but LARKCI_API_URL is set in your environment and takes precedence. Unset LARKCI_API_URL to use the profile's API URL.`,
      );
    }
  }

  if (!apiKey) {
    console.error(
      "Error: API key is required. Run `larkci login`, set LARKCI_API_KEY, or pass --api-key.",
    );
    console.error(`Config file: ${CONFIG_PATH}`);
    process.exit(1);
  }

  return { apiKey, apiUrl };
}
