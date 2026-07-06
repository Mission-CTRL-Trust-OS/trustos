/**
 * Edge Function: Basic Auth for all TrustOS Navigators under /navigator/*
 *
 * Per-client password. For /navigator/<client>/... the password is read from
 * the Netlify environment variable NAVIGATOR_PASSWORD_<CLIENT> (client slug
 * upper-cased, non-alphanumerics -> "_"). e.g. /navigator/solmax/ -> NAVIGATOR_PASSWORD_SOLMAX
 *
 * Set it in: Netlify dashboard -> Site configuration -> Environment variables.
 * Any username works — only the password is checked.
 */
export default async (request, context) => {
  const url = new URL(request.url);
  const m = url.pathname.match(/^\/navigator\/([^\/]+)/);
  if (!m || m[1] === "index.html") return context.next();

  const slug = m[1].toUpperCase().replace(/[^A-Z0-9]/g, "_");
  const envName = "NAVIGATOR_PASSWORD_" + slug;

  let password;
  try { password = Deno.env.get(envName); } catch (e) { password = undefined; }

  if (!password) {
    return new Response(
      "Access not configured — contact hello@missionctrl.agency",
      { status: 503, headers: { "content-type": "text/plain" } }
    );
  }

  const authHeader = request.headers.get("authorization") || "";
  if (authHeader.startsWith("Basic ")) {
    let provided = "";
    try {
      const decoded = atob(authHeader.slice(6));
      const colon = decoded.indexOf(":");
      provided = colon >= 0 ? decoded.slice(colon + 1) : decoded;
    } catch (e) {}
    if (provided === password) return context.next();
  }

  return new Response("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="TrustOS Navigator", charset="UTF-8"',
      "Cache-Control": "no-store",
      "content-type": "text/plain",
    },
  });
};

export const config = {
  path: ["/navigator/*"],
};
