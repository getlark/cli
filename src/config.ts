import dotenv from "dotenv";

dotenv.config();

export interface Config {
  apiKey: string;
  apiUrl: string;
}

const DEFAULT_API_URL = "https://api.getlark.ai";

export function getConfig(options: {
  apiKey?: string;
  apiUrl?: string;
}): Config {
  const apiKey = options.apiKey ?? process.env.LARKCI_API_KEY;
  const apiUrl = options.apiUrl ?? process.env.LARKCI_API_URL ?? DEFAULT_API_URL;

  if (!apiKey) {
    console.error(
      "Error: API key is required. Set LARKCI_API_KEY environment variable or pass --api-key."
    );
    process.exit(1);
  }

  return { apiKey, apiUrl };
}
