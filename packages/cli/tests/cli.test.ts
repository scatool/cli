import { expect, test } from "vite-plus/test";
import { folders } from "../src/commands/folders.ts";

test("folders command exposes CRUD subcommands", () => {
  const names = (folders.subcommands ?? []).map((c) => c.name);
  expect(names).toEqual(["list", "get", "create", "update", "delete"]);
});
