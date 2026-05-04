import { expect, test, vi } from "vite-plus/test";
import type { Revision, RevisionStatus } from "@scatool/sdk";
import { waitForRevision } from "../src/commands/revisions.ts";

function rev(status: RevisionStatus): Revision {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    projectId: "00000000-0000-0000-0000-000000000001",
    type: "sbom",
    status,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  };
}

function script(...statuses: RevisionStatus[]) {
  let i = 0;
  return vi.fn(async () => rev(statuses[Math.min(i++, statuses.length - 1)]!));
}

const noopSleep = async () => {};

test("returns when status reaches completed", async () => {
  const fetcher = script("created", "analyzing", "scanning", "completed");
  const onStatus = vi.fn();
  const result = await waitForRevision(fetcher, {
    timeoutSeconds: 60,
    intervalSeconds: 1,
    sleep: noopSleep,
    onStatus,
  });
  expect(result.status).toBe("completed");
  expect(fetcher).toHaveBeenCalledTimes(4);
  expect(onStatus.mock.calls.map((c) => c[0])).toEqual([
    "created",
    "analyzing",
    "scanning",
    "completed",
  ]);
});

test("returns when status reaches failed (caller decides exit code)", async () => {
  const fetcher = script("analyzing", "failed");
  const result = await waitForRevision(fetcher, {
    timeoutSeconds: 60,
    intervalSeconds: 1,
    sleep: noopSleep,
    onStatus: () => {},
  });
  expect(result.status).toBe("failed");
});

test("only emits each status once even when the API repeats it", async () => {
  const fetcher = script("created", "created", "analyzing", "analyzing", "completed");
  const onStatus = vi.fn();
  await waitForRevision(fetcher, {
    timeoutSeconds: 60,
    intervalSeconds: 1,
    sleep: noopSleep,
    onStatus,
  });
  expect(onStatus.mock.calls.map((c) => c[0])).toEqual(["created", "analyzing", "completed"]);
});

test("throws on timeout with the last seen status and label in the message", async () => {
  const fetcher = script("analyzing");
  let nowMs = 1000;
  const now = () => nowMs;
  const sleep = vi.fn(async (ms: number) => {
    nowMs += ms;
  });
  await expect(
    waitForRevision(fetcher, {
      timeoutSeconds: 5,
      intervalSeconds: 2,
      label: "rev-abc",
      now,
      sleep,
      onStatus: () => {},
    }),
  ).rejects.toThrow(/Timed out after 5s waiting for rev-abc \(last status: analyzing\)/);
});

test("does not sleep after a terminal status (returns immediately)", async () => {
  const fetcher = script("completed");
  const sleep = vi.fn(async () => {});
  await waitForRevision(fetcher, {
    timeoutSeconds: 60,
    intervalSeconds: 5,
    sleep,
    onStatus: () => {},
  });
  expect(sleep).not.toHaveBeenCalled();
});
