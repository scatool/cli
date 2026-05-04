import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { command, string } from "@drizzle-team/brocli";
import { type Upload, uploadFile } from "@scatool/sdk";
import { apiError } from "../api.ts";
import { requireClient } from "../context.ts";
import { emit } from "../output.ts";

export const UPLOAD_COLUMNS = [
  ["id", "ID"],
  ["filename", "FILENAME"],
  ["contentType", "TYPE"],
  ["size", "SIZE"],
  ["expiresAt", "EXPIRES"],
] as const;

export async function uploadFromPath(path: string): Promise<Upload> {
  let bytes: Buffer;
  try {
    bytes = await readFile(path);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`File not found: ${path}`);
    }
    throw err;
  }
  const file = new File([new Uint8Array(bytes)], basename(path));
  const { data, error, response } = await uploadFile({
    client: requireClient(),
    body: { file },
  });
  if (error) throw apiError(response, error);
  if (!data) throw new Error("Upload returned no body.");
  return data;
}

const create = command({
  name: "create",
  desc: "Upload a file. Uploads expire after 24 hours.",
  options: {
    file: string("file").required().desc("Path to the file to upload."),
  },
  handler: async (opts) => {
    const upload = await uploadFromPath(opts.file);
    emit(upload, UPLOAD_COLUMNS);
  },
});

export const uploads = command({
  name: "uploads",
  desc: "Manage file uploads.",
  subcommands: [create],
});
