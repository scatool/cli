import { expect, test, vi } from "vite-plus/test";
import { createClient, createConfig } from "../src/generated/client/index.ts";
import { listFolders } from "../src/index.ts";
import type { Folder } from "../src/index.ts";

test("generated SDK exports operations from openapi.yaml", () => {
  expect(typeof listFolders).toBe("function");
});

test("listFolders dispatches a GET to /v1/folders with the configured baseUrl", async () => {
  const folder: Folder = {
    id: "00000000-0000-0000-0000-000000000000",
    name: "root",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  };
  const fetch = vi.fn<typeof globalThis.fetch>(
    async () =>
      new Response(JSON.stringify({ items: [folder] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
  );
  const client = createClient(createConfig({ baseUrl: "https://example.test", fetch }));

  const { data, response } = await listFolders({ client });

  expect(response?.status).toBe(200);
  expect(data?.items[0]?.id).toBe(folder.id);
  expect(fetch).toHaveBeenCalledOnce();
  const [input] = fetch.mock.calls[0]!;
  expect(input).toBeInstanceOf(Request);
  const request = input as Request;
  expect(request.method).toBe("GET");
  expect(request.url).toBe("https://example.test/v1/folders");
});
