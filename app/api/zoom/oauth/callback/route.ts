import { NextRequest, NextResponse } from "next/server";
import { parseCookieSession, setSessionCookie, exchangeCodeForTokens } from "@/lib/zoom";

export async function GET(req: NextRequest) {
  const u = new URL(req.url);
  const code = u.searchParams.get("code");
  const state = u.searchParams.get("state");
  const err = u.searchParams.get("error");
  if (err) return htmlClose(false, `Zoom error: ${err}`);
  if (!code || !state) return htmlClose(false, "Missing code/state");

  const cookieHeader = req.headers.get("cookie") || "";
  const sess = parseCookieSession(cookieHeader);
  if (sess.state !== state) return htmlClose(false, "Invalid state");

  try {
    const tokens = await exchangeCodeForTokens(code);
    const res = htmlClose(true);
    res.headers.append("Set-Cookie", setSessionCookie(tokens));
    return res;
  } catch (e: any) {
    return htmlClose(false, e?.message || "Token exchange failed");
  }
}
function htmlClose(ok: boolean, msg = "") {
  const html = `<!doctype html><meta charset="utf-8"/><script>
try{window.opener&&window.opener.postMessage({type:"ZOOM_OAUTH_RESULT",ok:${ok?"true":"false"},error:${JSON.stringify(msg)}}, window.location.origin);}catch(e){}
window.close();
</script>`;
  return new NextResponse(html, { headers: { "Content-Type": "text/html" } });
}
