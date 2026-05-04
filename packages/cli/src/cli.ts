#!/usr/bin/env node
import { run, string } from "@drizzle-team/brocli";
import { folders } from "./commands/folders.ts";
import { projects } from "./commands/projects.ts";
import { revisions } from "./commands/revisions.ts";
import { uploads } from "./commands/uploads.ts";
import { type OutputFormat, setGlobals } from "./context.ts";

await run([folders, projects, revisions, uploads], {
  name: "scatool",
  description: "Command-line interface for the SCA Tool.",
  version: "0.0.0",
  globals: {
    token: string("token").desc("API token. Falls back to SCATOOL_TOKEN."),
    baseUrl: string("base-url").desc("API base URL. Falls back to SCATOOL_BASE_URL."),
    output: string("output").enum("table", "json").default("table").desc("Output format."),
  },
  hook: (event, _command, globals) => {
    if (event === "before") {
      setGlobals({
        token: globals.token,
        baseUrl: globals.baseUrl,
        output: globals.output as OutputFormat,
      });
    }
  },
  theme: (event) => {
    if (event.type === "error" && event.violation === "unknown_error") {
      const err = event.error;
      const message = err instanceof Error ? err.message : String(err);
      process.stderr.write(`error: ${message}\n`);
      return true;
    }
    return false;
  },
});
