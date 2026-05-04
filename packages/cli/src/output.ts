import { getContext } from "./context.ts";

export function emit(value: unknown, columns?: ReadonlyArray<readonly [string, string]>): void {
  const { output } = getContext();
  if (output === "json" || !columns) {
    process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
    return;
  }
  const rows = Array.isArray(value) ? value : [value];
  printTable(rows as Array<Record<string, unknown>>, columns);
}

function printTable(
  rows: Array<Record<string, unknown>>,
  columns: ReadonlyArray<readonly [string, string]>,
): void {
  if (rows.length === 0) {
    process.stdout.write("(no results)\n");
    return;
  }
  const headers = columns.map(([, label]) => label);
  const data = rows.map((row) => columns.map(([key]) => formatCell(row[key])));
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...data.map((row) => (row[i] ?? "").length)),
  );
  const line = (cells: string[]) => cells.map((cell, i) => cell.padEnd(widths[i] ?? 0)).join("  ");
  process.stdout.write(`${line(headers)}\n`);
  process.stdout.write(`${line(widths.map((w) => "-".repeat(w)))}\n`);
  for (const row of data) process.stdout.write(`${line(row)}\n`);
}

function formatCell(value: unknown): string {
  if (value === undefined || value === null) return "-";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}
