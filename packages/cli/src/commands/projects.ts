import { boolean, command, number, positional, string } from "@drizzle-team/brocli";
import {
  createProject,
  deleteProject,
  getProject,
  listProjects,
  updateProject,
} from "@scatool/sdk";
import { apiError } from "../api.ts";
import { requireClient } from "../context.ts";
import { emit } from "../output.ts";

const PROJECT_COLUMNS = [
  ["id", "ID"],
  ["name", "NAME"],
  ["folderId", "FOLDER"],
  ["createdAt", "CREATED"],
] as const;

const list = command({
  name: "list",
  desc: "List projects in the organization.",
  options: {
    folder: string("folder").desc("Filter to projects in this folder id."),
    limit: number("limit").desc("Maximum results per page."),
    cursor: string("cursor").desc("Cursor returned by a previous page."),
  },
  handler: async (opts) => {
    const { data, error, response } = await listProjects({
      client: requireClient(),
      query: {
        folderId: opts.folder,
        limit: opts.limit,
        cursor: opts.cursor,
      },
    });
    if (error) throw apiError(response, error);
    emit(data?.items ?? [], PROJECT_COLUMNS);
    if (data?.nextCursor) {
      process.stderr.write(`\nnext: --cursor ${data.nextCursor}\n`);
    }
  },
});

const get = command({
  name: "get",
  desc: "Show a project by id.",
  options: {
    projectId: positional("projectId").required().desc("Project id."),
  },
  handler: async (opts) => {
    const { data, error, response } = await getProject({
      client: requireClient(),
      path: { projectId: opts.projectId },
    });
    if (error) throw apiError(response, error);
    emit(data, PROJECT_COLUMNS);
  },
});

const create = command({
  name: "create",
  desc: "Create a project.",
  options: {
    name: string("name").required().desc("Project name."),
    folder: string("folder").desc("Folder id. Omit for the organization's default folder."),
  },
  handler: async (opts) => {
    const { data, error, response } = await createProject({
      client: requireClient(),
      body: { name: opts.name, folderId: opts.folder },
    });
    if (error) throw apiError(response, error);
    emit(data, PROJECT_COLUMNS);
  },
});

const update = command({
  name: "update",
  desc: "Rename or move a project.",
  options: {
    projectId: positional("projectId").required().desc("Project id."),
    name: string("name").desc("New project name."),
    folder: string("folder").desc("Move to this folder id."),
  },
  handler: async (opts) => {
    const body: { name?: string; folderId?: string } = {};
    if (opts.name !== undefined) body.name = opts.name;
    if (opts.folder !== undefined) body.folderId = opts.folder;
    if (Object.keys(body).length === 0) {
      throw new Error("Pass --name or --folder to update a project.");
    }
    const { data, error, response } = await updateProject({
      client: requireClient(),
      path: { projectId: opts.projectId },
      body,
    });
    if (error) throw apiError(response, error);
    emit(data, PROJECT_COLUMNS);
  },
});

const remove = command({
  name: "delete",
  desc: "Delete a project.",
  options: {
    projectId: positional("projectId").required().desc("Project id."),
    yes: boolean("yes").alias("y").desc("Skip the confirmation prompt.").default(false),
  },
  handler: async (opts) => {
    if (!opts.yes) {
      throw new Error("Refusing to delete without --yes.");
    }
    const { error, response } = await deleteProject({
      client: requireClient(),
      path: { projectId: opts.projectId },
    });
    if (error) throw apiError(response, error);
    process.stdout.write(`Deleted project ${opts.projectId}.\n`);
  },
});

export const projects = command({
  name: "projects",
  desc: "Manage projects.",
  subcommands: [list, get, create, update, remove],
});
