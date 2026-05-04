import { boolean, command, number, positional, string } from "@drizzle-team/brocli";
import { createFolder, deleteFolder, getFolder, listFolders, updateFolder } from "@scatool/sdk";
import { apiError } from "../api.ts";
import { requireClient } from "../context.ts";
import { emit } from "../output.ts";

const FOLDER_COLUMNS = [
  ["id", "ID"],
  ["name", "NAME"],
  ["parentFolderId", "PARENT"],
  ["createdAt", "CREATED"],
] as const;

const list = command({
  name: "list",
  desc: "List folders in the organization.",
  options: {
    parent: string("parent").desc("Filter to direct children of this folder id."),
    limit: number("limit").desc("Maximum results per page."),
    cursor: string("cursor").desc("Cursor returned by a previous page."),
  },
  handler: async (opts) => {
    const { data, error, response } = await listFolders({
      client: requireClient(),
      query: {
        parentFolderId: opts.parent,
        limit: opts.limit,
        cursor: opts.cursor,
      },
    });
    if (error) throw apiError(response, error);
    emit(data?.items ?? [], FOLDER_COLUMNS);
    if (data?.nextCursor) {
      process.stderr.write(`\nnext: --cursor ${data.nextCursor}\n`);
    }
  },
});

const get = command({
  name: "get",
  desc: "Show a folder by id.",
  options: {
    folderId: positional("folderId").required().desc("Folder id."),
  },
  handler: async (opts) => {
    const { data, error, response } = await getFolder({
      client: requireClient(),
      path: { folderId: opts.folderId },
    });
    if (error) throw apiError(response, error);
    emit(data, FOLDER_COLUMNS);
  },
});

const create = command({
  name: "create",
  desc: "Create a folder.",
  options: {
    name: string("name").required().desc("Folder name."),
    parent: string("parent").desc("Parent folder id. Omit for a top-level folder."),
  },
  handler: async (opts) => {
    const { data, error, response } = await createFolder({
      client: requireClient(),
      body: { name: opts.name, parentFolderId: opts.parent },
    });
    if (error) throw apiError(response, error);
    emit(data, FOLDER_COLUMNS);
  },
});

const update = command({
  name: "update",
  desc: "Rename or move a folder.",
  options: {
    folderId: positional("folderId").required().desc("Folder id."),
    name: string("name").desc("New folder name."),
    parent: string("parent").desc("New parent folder id. Pass 'root' to move to top level."),
  },
  handler: async (opts) => {
    const body: { name?: string; parentFolderId?: string | null } = {};
    if (opts.name !== undefined) body.name = opts.name;
    if (opts.parent !== undefined)
      body.parentFolderId = opts.parent === "root" ? null : opts.parent;
    if (Object.keys(body).length === 0) {
      throw new Error("Pass --name or --parent to update a folder.");
    }
    const { data, error, response } = await updateFolder({
      client: requireClient(),
      path: { folderId: opts.folderId },
      body,
    });
    if (error) throw apiError(response, error);
    emit(data, FOLDER_COLUMNS);
  },
});

const remove = command({
  name: "delete",
  desc: "Delete a folder. Fails if the folder is not empty.",
  options: {
    folderId: positional("folderId").required().desc("Folder id."),
    yes: boolean("yes").alias("y").desc("Skip the confirmation prompt.").default(false),
  },
  handler: async (opts) => {
    if (!opts.yes) {
      throw new Error("Refusing to delete without --yes.");
    }
    const { error, response } = await deleteFolder({
      client: requireClient(),
      path: { folderId: opts.folderId },
    });
    if (error) throw apiError(response, error);
    process.stdout.write(`Deleted folder ${opts.folderId}.\n`);
  },
});

export const folders = command({
  name: "folders",
  desc: "Manage folders.",
  subcommands: [list, get, create, update, remove],
});
