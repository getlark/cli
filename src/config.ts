import dotenv from "dotenv";
import { CONFIG_PATH, getProfile } from "./profile.js";

dotenv.config();

export interface Config {
  apiKey: string;
  apiUrl: string;
}

const DEFAULT_API_URL = "https://api.getlark.ai";

let warnedLegacyApiKey = false;
let warnedLegacyApiUrl = false;

function readEnvApiKey(): string | undefined {
  const fresh = process.env.GETLARK_API_KEY;
  if (fresh) return fresh;
  const legacy = process.env.LARKCI_API_KEY;
  if (legacy) {
    if (!warnedLegacyApiKey) {
      console.error(
        "Warning: LARKCI_API_KEY is deprecated. Rename to GETLARK_API_KEY.",
      );
      warnedLegacyApiKey = true;
    }
    return legacy;
  }
  return undefined;
}

function readEnvApiUrl(): string | undefined {
  const fresh = process.env.GETLARK_API_URL;
  if (fresh) return fresh;
  const legacy = process.env.LARKCI_API_URL;
  if (legacy) {
    if (!warnedLegacyApiUrl) {
      console.error(
        "Warning: LARKCI_API_URL is deprecated. Rename to GETLARK_API_URL.",
      );
      warnedLegacyApiUrl = true;
    }
    return legacy;
  }
  return undefined;
}

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
        `Error: Profile "${options.profile}" not found. Run \`getlark config list\` to see available profiles.`,
      );
      process.exit(1);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${message}`);
    process.exit(1);
  }

  const envApiKey = readEnvApiKey();
  const envApiUrl = readEnvApiUrl();

  const apiKey = options.apiKey ?? envApiKey ?? fileApiKey;
  const apiUrl = options.apiUrl ?? envApiUrl ?? fileApiUrl ?? DEFAULT_API_URL;

  if (options.profile) {
    if (envApiKey && fileApiKey && envApiKey !== fileApiKey) {
      console.error(
        `Warning: --profile "${options.profile}" was specified, but GETLARK_API_KEY is set in your environment and takes precedence. Unset GETLARK_API_KEY to use the profile's API key.`,
      );
    }
    if (envApiUrl && fileApiUrl && envApiUrl !== fileApiUrl) {
      console.error(
        `Warning: --profile "${options.profile}" was specified, but GETLARK_API_URL is set in your environment and takes precedence. Unset GETLARK_API_URL to use the profile's API URL.`,
      );
    }
  }

  if (!apiKey) {
    console.error(
      "Error: API key is required. Run `getlark login`, set GETLARK_API_KEY, or pass --api-key.",
    );
    console.error(`Config file: ${CONFIG_PATH}`);
    process.exit(1);
  }

  return { apiKey, apiUrl };
}
