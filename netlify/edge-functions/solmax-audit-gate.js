/**
 * Edge Function: branded sign-in for the Solmax data audit collector
 * (/navigator/solmax/data-audit/*).
 *
 * Same lock, nicer door. /navigator/* is gated by browser Basic Auth
 * (navigator-auth.js), which throws the operating system's own grey dialog and
 * asks for a username nobody has. This page is the one the client sees first,
 * so it gets a TrustOS screen instead — and while someone is typing anyway, it
 * takes the one thing step one used to ask for twice: their Solmax email.
 *
 * The password is NOT removed. It is read from NAVIGATOR_PASSWORD_SOLMAX —
 * deliberately the very same environment variable the Basic Auth gate reads for
 * this client — so exactly the same secret opens exactly the same page and
 * nothing about who can get in changes. navigator-auth.js carries a one-line
 * exemption for this path so the browser dialog does not also fire.
 *
 * Set it in: Netlify dashboard -> Site configuration -> Environment variables.
 *
 * On success two cookies are set for 30 days: a SHA-256 access marker (so the
 * secret itself is never stored in the browser) and the captured email, which
 * the collector page reads to prefill step one. Fails closed if the variable is
 * not set.
 */

const COOKIE = "solmax_audit";
const COOKIE_EMAIL = "solmax_audit_email";
const DOMAIN = "solmax.com";
const COOKIE_OPTS = "Path=/navigator/solmax/data-audit; Max-Age=2592000; Secure; SameSite=Lax";

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* The local part is checked with the same four rules, in the same order, as the
   collector's own shareAddress() — so a address this screen accepts is one that
   screen would accept too, and the two never disagree about the same typing.
   Wording is first-person here ("your") because on the share control it is a
   colleague being named; the rules themselves are unchanged. */
function badLocal(v) {
  if (!v) return "Add the first part of your Solmax address — the bit before the @.";
  if (v.indexOf("@") > -1) return "Leave the @" + DOMAIN + " off — we add it for you. Just the part before it.";
  if (/\s/.test(v)) return "An email address cannot contain a space.";
  if (!/^[A-Za-z0-9._%+-]+$/.test(v)) return "Letters, numbers, dots, dashes and underscores only.";
  return "";
}

function gatePage(err, local) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta name="robots" content="noindex, nofollow"/>
<title>Solmax data audit</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&display=swap" rel="stylesheet"/>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{background:#0A0F1A;min-height:100%}
body{font-family:Sora,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#fff;
display:flex;align-items:center;justify-content:center;min-height:100svh;padding:24px;
background:radial-gradient(120% 90% at 12% 8%,#16222f 0%,#0F1826 45%,#0A0F1A 100%)}
.wrap{position:relative;width:100%;max-width:430px;text-align:left}
.mark{display:flex;align-items:center;gap:9px;margin-bottom:34px}
.mark span{font-size:1.02rem;font-weight:800;letter-spacing:-.03em}
.mark .os{color:#5a8a9a}
h1{font-size:clamp(1.7rem,5.6vw,2.2rem);font-weight:800;letter-spacing:-.04em;line-height:1.1}
p.sub{font-size:.88rem;color:rgba(255,255,255,.5);line-height:1.7;margin-top:14px}
form{margin-top:26px}
label{display:block;font-size:.74rem;font-weight:600;letter-spacing:.04em;text-transform:uppercase;
color:#8fb5c0;margin-bottom:7px}
.field{margin-bottom:16px}
/* the domain is part of the control, not a hint inside it: one 2px border around
   both, no gap and no radius where they meet, so it cannot be typed over or
   mistaken for placeholder text the visitor is meant to replace */
.combo{display:flex;align-items:stretch;background:rgba(255,255,255,.04);
border:2px solid rgba(143,181,192,.3);border-radius:6px}
.combo:focus-within{border-color:#6da0b8}
.combo input{flex:1 1 auto;min-width:0;background:none;border:none;border-radius:4px 0 0 4px;
font-family:inherit;font-size:1rem;color:#fff;padding:13px 14px}
.combo input:focus{outline:none}
.combo .at{flex:0 0 auto;display:flex;align-items:center;white-space:nowrap;
font-size:.92rem;font-weight:600;color:#8fb5c0;background:rgba(143,181,192,.12);
border-left:2px solid rgba(143,181,192,.3);border-radius:0 4px 4px 0;padding:0 13px}
input.solo{width:100%;font-family:inherit;font-size:1rem;color:#fff;background:rgba(255,255,255,.04);
border:2px solid rgba(143,181,192,.3);border-radius:6px;padding:13px 14px}
input.solo:focus{outline:none;border-color:#6da0b8}
button{font-family:inherit;font-size:.95rem;font-weight:700;color:#fff;background:#5A8A9A;
border:2px solid #6da0b8;border-radius:6px;padding:13px 30px;cursor:pointer;margin-top:4px}
button:hover{background:#4d7a8a}
/* an error reads as an error through weight and the rule beside it, not through a
   warm colour — orange is MissionCTRL's, never TrustOS's */
.err{font-size:.8rem;font-weight:600;color:#9fc8d8;line-height:1.6;margin-top:16px;
border-left:2px solid #6da0b8;padding-left:12px}
.foot{font-size:.6rem;color:rgba(255,255,255,.28);margin-top:34px;line-height:1.8}
.foot a{color:rgba(255,255,255,.4)}
@media (max-width:420px){.combo .at{font-size:.84rem;padding:0 10px}}
</style></head><body>
<div class="wrap">
  <span class="mark">
    <svg width="20" height="25" viewBox="0 0 120 148" fill="none" aria-hidden="true">
      <defs><linearGradient id="g" x1="60" y1="12" x2="60" y2="88">
      <stop offset="0%" stop-color="#6da0b8"/><stop offset="100%" stop-color="#5a8a9a"/></linearGradient></defs>
      <path d="M4,140 L30,12 L60,88 L90,12 L116,140 Z" fill="#fff" opacity=".06"/>
      <polygon points="30,12 90,12 60,88" fill="url(#g)"/>
      <polygon points="30,12 90,12 60,88" fill="none" stroke="#8fb5c0" stroke-width="1.6"/>
    </svg>
    <span>Trust<span class="os">OS</span></span>
  </span>
  <h1>Solmax data audit</h1>
  <p class="sub">Your Solmax email, so the return is attributed to you, and the password you were sent.</p>
  <form method="POST" action="">
    <div class="field">
      <label for="email_local">Your Solmax email</label>
      <span class="combo">
        <input type="text" id="email_local" name="email_local" value="${esc(local)}"
          autofocus autocomplete="email" inputmode="email" spellcheck="false" autocapitalize="off"/>
        <span class="at" aria-hidden="true">@${DOMAIN}</span>
      </span>
    </div>
    <div class="field">
      <label for="password">Solmax access password</label>
      <input class="solo" type="password" id="password" name="password" autocomplete="current-password"/>
    </div>
    <button type="submit">Continue</button>
  </form>
  ${err ? '<p class="err" role="alert">' + esc(err) + "</p>" : ""}
  <p class="foot">Mission CTRL Ltd &middot; Company No. 17018199<br/>
  Trouble getting in? <a href="mailto:hello@missionctrl.agency">hello@missionctrl.agency</a></p>
</div>
</body></html>`;
}

export default async (request, context) => {
  let password;
  try { password = Deno.env.get("NAVIGATOR_PASSWORD_SOLMAX"); } catch (e) { password = undefined; }

  if (!password) {
    return new Response("Access not configured — contact hello@missionctrl.agency", {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    });
  }

  const token = await sha256("solmax-audit:" + password);
  const noStore = { "cache-control": "no-store", "content-type": "text/html; charset=utf-8" };

  // already through the door?
  const cookies = request.headers.get("cookie") || "";
  if (cookies.split(/;\s*/).some((c) => c === COOKIE + "=" + token)) {
    return context.next();
  }

  // submitted the form?
  if (request.method === "POST") {
    let local = "", given = "";
    try {
      const form = await request.formData();
      local = String(form.get("email_local") || "").trim();
      given = String(form.get("password") || "");
    } catch (e) {}

    const mailErr = badLocal(local);
    if (mailErr) return new Response(gatePage(mailErr, local), { status: 401, headers: noStore });

    /* Compared raw and exactly, NOT through the trimming, lower-casing norm() that
       viiv-passcode.js uses. navigator-auth.js tests `provided === password`, and
       this screen has to be the same lock: a password that opens the browser dialog
       today must keep working identically, and nothing the dialog rejects may start
       being accepted here. */
    if (given !== password) {
      /* which field failed is not named beyond "the password" — a wrong password
         must not confirm that an address was the right one */
      return new Response(gatePage("That password was not recognised. It is the one you were sent with the link.", local), { status: 401, headers: noStore });
    }

    const headers = new Headers({ "cache-control": "no-store" });
    /* Back to the same path, never ?email= or #email= — the collector has a "copy
       the link" control that copies location, so an address in the URL would be
       passed around the building the first time anyone shared the page. */
    headers.set("location", new URL(request.url).pathname);
    // access marker: a hash, so the cookie never carries the password itself
    headers.append("set-cookie", `${COOKIE}=${token}; ${COOKIE_OPTS}; HttpOnly`);
    /* readable on purpose — no HttpOnly, because the collector's own script reads
       it to prefill step one. It holds nothing but the visitor's own address, which
       they just typed and are about to see in that field anyway. */
    headers.append("set-cookie", `${COOKIE_EMAIL}=${encodeURIComponent(local + "@" + DOMAIN)}; ${COOKIE_OPTS}`);
    return new Response(null, { status: 303, headers });
  }

  return new Response(gatePage("", ""), { status: 401, headers: noStore });
};

export const config = {
  path: ["/navigator/solmax/data-audit", "/navigator/solmax/data-audit/*"],
};
