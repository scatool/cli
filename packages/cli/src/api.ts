export function requireProjectId(flag: string | undefined): string {
  const projectId = flag ?? process.env.SCATOOL_PROJECT_ID;
  if (!projectId) {
    throw new Error("No project id. Pass --project <id> or set SCATOOL_PROJECT_ID.");
  }
  return projectId;
}

export function apiError(response: Response | undefined, error: unknown): Error {
  const status = response ? `HTTP ${response.status}` : "request failed";
  const body =
    error === undefined || error === null
      ? "(no body)"
      : typeof error === "string"
        ? error
        : JSON.stringify(error);
  return new Error(`${status}: ${body}`);
}
