import { expect, test } from "vite-plus/test";
import { folders } from "../src/commands/folders.ts";
import { projects } from "../src/commands/projects.ts";
import { revisions } from "../src/commands/revisions.ts";
import { uploads } from "../src/commands/uploads.ts";

test("folders command exposes CRUD subcommands", () => {
  const names = (folders.subcommands ?? []).map((c) => c.name);
  expect(names).toEqual(["list", "get", "create", "update", "delete"]);
});

test("projects command exposes CRUD subcommands", () => {
  const names = (projects.subcommands ?? []).map((c) => c.name);
  expect(names).toEqual(["list", "get", "create", "update", "delete"]);
});

test("revisions command exposes the expected subcommands", () => {
  const names = (revisions.subcommands ?? []).map((c) => c.name);
  expect(names).toEqual(["list", "get", "create-archive", "create-sbom", "wait"]);
});

test("uploads command exposes create", () => {
  const names = (uploads.subcommands ?? []).map((c) => c.name);
  expect(names).toEqual(["create"]);
});
