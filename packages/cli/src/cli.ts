#!/usr/bin/env node
import { run, string } from "@drizzle-team/brocli";
import { folders } from "./commands/folders.ts";
import { projects } from "./commands/projects.ts";
import { type OutputFormat, setGlobals } from "./context.ts";

try {
  await run([folders, projects], {
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
  });
} catch (err) {
  process.stderr.write(`error: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
}
