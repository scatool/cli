import { boolean, command, number, positional, string } from "@drizzle-team/brocli";
import {
  createRevision,
  getRevision,
  listRevisions,
  type Revision,
  type RevisionStatus,
} from "@scatool/sdk";
import { apiError, requireProjectId } from "../api.ts";
import { requireClient } from "../context.ts";
import { emit } from "../output.ts";
import { uploadFromPath } from "./uploads.ts";

const REVISION_COLUMNS = [
  ["id", "ID"],
  ["type", "TYPE"],
  ["status", "STATUS"],
  ["createdAt", "CREATED"],
] as const;

const TERMINAL_STATUSES: ReadonlySet<RevisionStatus> = new Set(["completed", "failed"]);

const list = command({
  name: "list",
  desc: "List revisions for a project.",
  options: {
    project: string("project").desc("Project id. Falls back to SCATOOL_PROJECT_ID."),
    limit: number("limit").desc("Maximum results per page."),
    cursor: string("cursor").desc("Cursor returned by a previous page."),
  },
  handler: async (opts) => {
    const projectId = requireProjectId(opts.project);
    const { data, error, response } = await listRevisions({
      client: requireClient(),
      path: { projectId },
      query: { limit: opts.limit, cursor: opts.cursor },
    });
    if (error) throw apiError(response, error);
    emit(data?.items ?? [], REVISION_COLUMNS);
    if (data?.nextCursor) {
      process.stderr.write(`\nnext: --cursor ${data.nextCursor}\n`);
    }
  },
});

const get = command({
  name: "get",
  desc: "Show a revision by id.",
  options: {
    revisionId: positional("revisionId").required().desc("Revision id."),
    project: string("project").desc("Project id. Falls back to SCATOOL_PROJECT_ID."),
  },
  handler: async (opts) => {
    const projectId = requireProjectId(opts.project);
    const revision = await fetchRevision(projectId, opts.revisionId);
    emit(revision, REVISION_COLUMNS);
  },
});

const createArchive = command({
  name: "create-archive",
  desc: "Upload an archive (zip/tar) and create a revision from it.",
  options: createOptions(),
  handler: (opts) => createRevisionHandler("archive", opts),
});

const createSbom = command({
  name: "create-sbom",
  desc: "Upload an SBOM (CycloneDX or SPDX, JSON or XML) and create a revision from it.",
  options: createOptions(),
  handler: (opts) => createRevisionHandler("sbom", opts),
});

const wait = command({
  name: "wait",
  desc: "Poll a revision until it reaches a terminal status.",
  options: {
    revisionId: positional("revisionId").required().desc("Revision id."),
    project: string("project").desc("Project id. Falls back to SCATOOL_PROJECT_ID."),
    timeout: number("timeout").default(600).desc("Timeout in seconds."),
    interval: number("interval").default(5).desc("Polling interval in seconds."),
  },
  handler: async (opts) => {
    const projectId = requireProjectId(opts.project);
    const revision = await waitForRevision(() => fetchRevision(projectId, opts.revisionId), {
      timeoutSeconds: opts.timeout,
      intervalSeconds: opts.interval,
      label: opts.revisionId,
    });
    emit(revision, REVISION_COLUMNS);
    if (revision.status === "failed") process.exit(1);
  },
});

function createOptions() {
  return {
    label: positional("label").required().desc("Version label, e.g. 'v1.4.2'."),
    project: string("project").desc("Project id. Falls back to SCATOOL_PROJECT_ID."),
    file: string("file").desc("Path to a file to upload. Mutually exclusive with --upload-id."),
    uploadId: string("upload-id").desc(
      "Reuse an existing upload id. Mutually exclusive with --file.",
    ),
    wait: boolean("wait")
      .default(false)
      .desc("Block until the revision reaches a terminal status."),
    timeout: number("timeout").default(600).desc("Wait timeout in seconds."),
    interval: number("interval").default(5).desc("Wait polling interval in seconds."),
  };
}

interface CreateOpts {
  label: string;
  project: string | undefined;
  file: string | undefined;
  uploadId: string | undefined;
  wait: boolean;
  timeout: number;
  interval: number;
}

async function createRevisionHandler(type: "archive" | "sbom", opts: CreateOpts): Promise<void> {
  if ((opts.file === undefined) === (opts.uploadId === undefined)) {
    throw new Error("Pass exactly one of --file or --upload-id.");
  }
  const projectId = requireProjectId(opts.project);
  const uploadId = opts.uploadId ?? (await uploadFromPath(opts.file as string)).id;

  const { data, error, response } = await createRevision({
    client: requireClient(),
    path: { projectId },
    body: { type, uploadId, version: opts.label },
  });
  if (error) throw apiError(response, error);
  if (!data) throw new Error("createRevision returned no body.");

  const final = opts.wait
    ? await waitForRevision(() => fetchRevision(projectId, data.id), {
        timeoutSeconds: opts.timeout,
        intervalSeconds: opts.interval,
        label: data.id,
      })
    : data;
  emit(final, REVISION_COLUMNS);
  if (opts.wait && final.status === "failed") process.exit(1);
}

async function fetchRevision(projectId: string, revisionId: string): Promise<Revision> {
  const { data, error, response } = await getRevision({
    client: requireClient(),
    path: { projectId, revisionId },
  });
  if (error) throw apiError(response, error);
  if (!data) throw new Error("getRevision returned no body.");
  return data;
}

export interface WaitForRevisionOptions {
  timeoutSeconds: number;
  intervalSeconds: number;
  label?: string;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  onStatus?: (status: RevisionStatus) => void;
}

export async function waitForRevision(
  fetcher: () => Promise<Revision>,
  options: WaitForRevisionOptions,
): Promise<Revision> {
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? defaultSleep;
  const onStatus = options.onStatus ?? ((status) => process.stderr.write(`status: ${status}\n`));
  const deadline = now() + options.timeoutSeconds * 1000;
  let lastStatus: RevisionStatus | undefined;
  while (true) {
    const revision = await fetcher();
    if (revision.status !== lastStatus) {
      onStatus(revision.status);
      lastStatus = revision.status;
    }
    if (TERMINAL_STATUSES.has(revision.status)) return revision;
    if (now() >= deadline) {
      const tail = options.label ? ` for ${options.label}` : "";
      throw new Error(
        `Timed out after ${options.timeoutSeconds}s waiting${tail} (last status: ${revision.status}).`,
      );
    }
    await sleep(options.intervalSeconds * 1000);
  }
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const revisions = command({
  name: "revisions",
  desc: "Manage project revisions.",
  subcommands: [list, get, createArchive, createSbom, wait],
});
