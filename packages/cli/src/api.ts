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
