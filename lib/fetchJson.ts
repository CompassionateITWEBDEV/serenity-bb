export async function fetchJson<T = unknown>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, { ...init, headers: { ...(init?.headers || {}), Accept: "application/json" } });
  const ct = res.headers.get("content-type") || "";
  // Why: Block HTML (redirects/404 pages) from leaking into UI.
  if (!ct.includes("application/json")) {
    const text = await res.text();
    throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 140)}…`);
  }
  const body = (await res.json()) as any;
  if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
  return body as T;
}
