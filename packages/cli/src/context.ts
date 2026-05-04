import { type Client, createClient, createConfig } from "@scatool/sdk";

export const DEFAULT_BASE_URL = "https://api.scatool.com";

export type OutputFormat = "table" | "json";

export interface Globals {
  token: string | undefined;
  baseUrl: string | undefined;
  output: OutputFormat;
}

export interface ResolvedContext {
  token: string | undefined;
  baseUrl: string;
  output: OutputFormat;
}

let current: ResolvedContext | undefined;

export function setGlobals(globals: Globals): void {
  const token = globals.token ?? process.env.SCATOOL_TOKEN;
  const baseUrl = globals.baseUrl ?? process.env.SCATOOL_BASE_URL ?? DEFAULT_BASE_URL;
  current = { token, baseUrl, output: globals.output };
}

export function getContext(): ResolvedContext {
  if (!current) throw new Error("Globals were not initialized.");
  return current;
}

export function requireClient(): Client {
  const ctx = getContext();
  if (!ctx.token) {
    throw new Error("No API token. Pass --token <token> or set SCATOOL_TOKEN.");
  }
  return createClient(
    createConfig({
      baseUrl: ctx.baseUrl,
      auth: ctx.token,
    }),
  );
}
