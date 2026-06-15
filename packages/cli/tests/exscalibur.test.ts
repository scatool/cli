import { expect, test } from "vite-plus/test";
import { extractSbom } from "../src/exscalibur.ts";

test("extractSbom extracts this pnpm workspace", async () => {
  const result = await extractSbom(".");

  expect(result.packages.length).toBeGreaterThan(0);
  expect(result.subprojects.map((subproject) => subproject.purl)).toContain(
    "pkg:npm/%40scatool/lib@0.0.0",
  );
});

test("extractSbom supports additive ignore patterns", async () => {
  const result = await extractSbom(".", {
    ignore: ["**/pnpm-lock.yaml", "**/package.json"],
  });

  expect(result.packages).toEqual([]);
  expect(result.subprojects).toEqual([]);
});
