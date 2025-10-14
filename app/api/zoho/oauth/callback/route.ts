import { NextRequest, NextResponse } from "next/server";
import {
  getRegionBase,
  parseCookieSession,
  setSessionCookie,
  exchangeCodeForTokens,
} from "@/lib/zoho";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  // Early failure path
  if (error) return htmlClose(false, `Zoho error: ${error}`);

  if (!code || !state) return htmlClose(false, "Missing code/state");

  // CSRF check
  const cookies = req.headers.get("cookie") || "";
  const parsed = parseCookieSession(cookies);
  if (parsed.state !== state) return htmlClose(false, "Invalid state");

  try {
    const tokens = await exchangeCodeForTokens(code);
    const res = htmlClose(true, "");
    res.headers.append("Set-Cookie", setSessionCookie(tokens));
    return res;
  } catch (e: any) {
    return htmlClose(false, e?.message || "Token exchange failed");
  }
}

// Tiny HTML that notifies opener and closes the popup
function htmlClose(ok: boolean, err?: string) {
  const body = `<!doctype html>
<html><body>
<script>
  try {
    window.opener && window.opener.postMessage({
      type: "ZOHO_OAUTH_RESULT",
      ok: ${ok ? "true" : "false"},
      error: ${JSON.stringify(err || "")}
    }, window.location.origin);
  } catch (e) {}
  window.close();
</script>
</body></html>`;
  return new NextResponse(body, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
