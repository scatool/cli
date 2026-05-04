import { afterEach, beforeEach, expect, test } from "vite-plus/test";
import { requireProjectId } from "../src/api.ts";
import { DEFAULT_BASE_URL, getContext, setGlobals } from "../src/context.ts";

const ENV_KEYS = ["SCATOOL_PROJECT_ID", "SCATOOL_TOKEN", "SCATOOL_BASE_URL"] as const;
let saved: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};

beforeEach(() => {
  saved = {};
  for (const key of ENV_KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

test("requireProjectId: flag wins over env", () => {
  process.env.SCATOOL_PROJECT_ID = "from-env";
  expect(requireProjectId("from-flag")).toBe("from-flag");
});

test("requireProjectId: falls back to SCATOOL_PROJECT_ID env", () => {
  process.env.SCATOOL_PROJECT_ID = "from-env";
  expect(requireProjectId(undefined)).toBe("from-env");
});

test("requireProjectId: throws when neither flag nor env is set", () => {
  expect(() => requireProjectId(undefined)).toThrow(/No project id/);
});

test("setGlobals: flag wins over env for token", () => {
  process.env.SCATOOL_TOKEN = "env-token";
  setGlobals({ token: "flag-token", baseUrl: undefined, output: "table" });
  expect(getContext().token).toBe("flag-token");
});

test("setGlobals: token falls back to SCATOOL_TOKEN env", () => {
  process.env.SCATOOL_TOKEN = "env-token";
  setGlobals({ token: undefined, baseUrl: undefined, output: "table" });
  expect(getContext().token).toBe("env-token");
});

test("setGlobals: token left undefined when neither flag nor env is set", () => {
  setGlobals({ token: undefined, baseUrl: undefined, output: "table" });
  expect(getContext().token).toBeUndefined();
});

test("setGlobals: baseUrl resolution flag → env → default", () => {
  setGlobals({ token: "t", baseUrl: "https://flag.example", output: "table" });
  expect(getContext().baseUrl).toBe("https://flag.example");

  process.env.SCATOOL_BASE_URL = "https://env.example";
  setGlobals({ token: "t", baseUrl: undefined, output: "table" });
  expect(getContext().baseUrl).toBe("https://env.example");

  delete process.env.SCATOOL_BASE_URL;
  setGlobals({ token: "t", baseUrl: undefined, output: "table" });
  expect(getContext().baseUrl).toBe(DEFAULT_BASE_URL);
});
