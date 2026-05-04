import { expect, test } from "vite-plus/test";
import { folders } from "../src/commands/folders.ts";
import { projects } from "../src/commands/projects.ts";

test("folders command exposes CRUD subcommands", () => {
  const names = (folders.subcommands ?? []).map((c) => c.name);
  expect(names).toEqual(["list", "get", "create", "update", "delete"]);
});

test("projects command exposes CRUD subcommands", () => {
  const names = (projects.subcommands ?? []).map((c) => c.name);
  expect(names).toEqual(["list", "get", "create", "update", "delete"]);
});
