import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export interface ProfileData {
  api_key: string;
  api_url?: string;
}

export interface ConfigFileData {
  current_profile: string;
  profiles: Record<string, ProfileData>;
}

export const CONFIG_DIR = path.join(os.homedir(), ".getlark");
export const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");
export const DEFAULT_PROFILE_NAME = "default";

export function readConfigFile(): ConfigFileData | null {
  let raw: string;
  try {
    raw = fs.readFileSync(CONFIG_PATH, "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(
      `Config file at ${CONFIG_PATH} is not valid JSON. Fix or remove it.`,
    );
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as ConfigFileData).profiles !== "object" ||
    (parsed as ConfigFileData).profiles === null
  ) {
    throw new Error(
      `Config file at ${CONFIG_PATH} is malformed. Expected { current_profile, profiles }.`,
    );
  }

  const data = parsed as ConfigFileData;
  if (typeof data.current_profile !== "string") data.current_profile = "";
  return data;
}

export function writeConfigFile(data: ConfigFileData): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  const tmp = `${CONFIG_PATH}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(tmp, CONFIG_PATH);
}

export function getProfile(profileName?: string): {
  name: string;
  data: ProfileData;
} | null {
  const file = readConfigFile();
  if (!file) return null;
  const name = profileName ?? file.current_profile;
  if (!name) return null;
  const data = file.profiles[name];
  if (!data) {
    if (profileName) {
      throw new Error(
        `Profile "${profileName}" not found in ${CONFIG_PATH}. Run \`larkci config list\` to see available profiles.`,
      );
    }
    return null;
  }
  if (
    typeof data !== "object" ||
    data === null ||
    typeof (data as ProfileData).api_key !== "string" ||
    (data as ProfileData).api_key === ""
  ) {
    throw new Error(
      `Profile "${name}" in ${CONFIG_PATH} is malformed: missing or invalid "api_key".`,
    );
  }
  return { name, data };
}

export function removeProfile(name: string): boolean {
  const file = readConfigFile();
  if (!file || !file.profiles[name]) return false;
  delete file.profiles[name];
  if (file.current_profile === name) {
    const remaining = Object.keys(file.profiles);
    file.current_profile = remaining[0] ?? "";
  }
  writeConfigFile(file);
  return true;
}

export function setCurrentProfile(name: string): boolean {
  const file = readConfigFile();
  if (!file || !file.profiles[name]) return false;
  file.current_profile = name;
  writeConfigFile(file);
  return true;
}

export function maskApiKey(key: string): string {
  if (key.length <= 4) return "****";
  return `****${key.slice(-4)}`;
}
