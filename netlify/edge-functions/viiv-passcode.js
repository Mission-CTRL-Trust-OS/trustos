/**
 * Edge Function: passcode gate for the ViiV campaign pages (/viiv/*).
 *
 * Client work — not public. Unlike /navigator/* (browser Basic Auth), this
 * serves a BRANDED gate, because the passcode is part of the campaign: the
 * word is "Unmute", and typing it is the first act of the idea.
 *
 * Set the passcode in: Netlify -> Site configuration -> Environment variables
 *   VIIV_PASSCODE = Unmute
 * Comparison is case-insensitive and trims whitespace.
 *
 * On success a cookie holding a SHA-256 of the passcode is set for 30 days,
 * so the visitor types it once. Fails closed if the variable is not set.
 */

const COOKIE = "viiv_access";

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function norm(v) {
  return String(v || "").trim().toLowerCase();
}

function gatePage(retry) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta name="robots" content="noindex, nofollow"/>
<title>Unmute</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&display=swap" rel="stylesheet"/>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{background:#0A0F1A;min-height:100%}
body{font-family:Sora,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#fff;
display:flex;align-items:center;justify-content:center;min-height:100svh;padding:24px;
background:radial-gradient(120% 90% at 12% 8%,#0E1826 0%,#0A0F1A 55%,#080C14 100%);overflow:hidden}
.bars{position:fixed;inset:0;display:flex;align-items:flex-end;justify-content:center;gap:10px;
padding:0 3vw;pointer-events:none;opacity:.5}
.bar{width:6px;border-radius:3px 3px 0 0;transform-origin:bottom;
background:linear-gradient(to top,rgba(255,255,255,.05),rgba(255,255,255,.01))}
.wrap{position:relative;width:100%;max-width:430px;text-align:left}
.mark{display:flex;align-items:center;gap:9px;margin-bottom:34px}
.mark span{font-size:1.02rem;font-weight:800;letter-spacing:-.03em}
.mark .os{color:#5a8a9a}
h1{font-size:clamp(2rem,7vw,2.8rem);font-weight:800;letter-spacing:-.04em;line-height:1.05}
h1 em{font-style:normal;color:#8fb5c0}
p.sub{font-size:.88rem;color:rgba(255,255,255,.5);line-height:1.7;margin-top:16px}
form{margin-top:30px;display:flex;gap:10px;flex-wrap:wrap}
input{flex:1;min-width:190px;font-family:inherit;font-size:1rem;color:#fff;background:rgba(255,255,255,.04);
border:1px solid rgba(255,255,255,.18);border-radius:8px;padding:15px 16px}
input:focus{outline:none;border-color:#8fb5c0}
button{font-family:inherit;font-size:.95rem;font-weight:700;color:#fff;background:#5A8A9A;border:none;
border-radius:8px;padding:15px 30px;cursor:pointer}
button:hover{background:#4d7a8a}
.err{font-size:.78rem;color:#e0876a;margin-top:14px}
.foot{font-size:.6rem;color:rgba(255,255,255,.28);margin-top:38px;line-height:1.8}
.foot a{color:rgba(255,255,255,.4)}
</style></head><body>
<div class="bars" aria-hidden="true" id="bars"></div>
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
  <h1>This one needs<br/><em>a word.</em></h1>
  <p class="sub">Prepared for ViiV Healthcare and shared in confidence. If you were sent this link, you were sent the word with it.</p>
  <form method="POST" action="">
    <input type="password" name="passcode" placeholder="The word" autocomplete="off" autofocus aria-label="Passcode"/>
    <button type="submit">Unmute</button>
  </form>
  ${retry ? '<p class="err">Not that one. Try again, or ask whoever sent you the link.</p>' : ""}
  <p class="foot">Mission CTRL Ltd · Company No. 17018199<br/>
  Trouble getting in? <a href="mailto:hello@missionctrl.agency">hello@missionctrl.agency</a></p>
</div>
<script>
(function(){
  var f=document.getElementById('bars'),n=Math.max(24,Math.min(60,Math.floor(innerWidth/26)));
  for(var i=0;i<n;i++){var b=document.createElement('div');b.className='bar';
  b.style.height=(8+Math.round(30*Math.abs(Math.sin(i*2.399))))+'vh';f.appendChild(b);}
})();
</script>
</body></html>`;
}

export default async (request, context) => {
  let passcode;
  try { passcode = Deno.env.get("VIIV_PASSCODE"); } catch (e) { passcode = undefined; }

  if (!passcode) {
    return new Response("Access not configured — contact hello@missionctrl.agency", {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    });
  }

  const token = await sha256(norm(passcode));
  const noStore = { "cache-control": "no-store", "content-type": "text/html; charset=utf-8" };

  // already unlocked?
  const cookies = request.headers.get("cookie") || "";
  if (cookies.split(/;\s*/).some((c) => c === COOKIE + "=" + token)) {
    return context.next();
  }

  // submitted the form?
  if (request.method === "POST") {
    let given = "";
    try {
      const form = await request.formData();
      given = form.get("passcode") || "";
    } catch (e) {}

    if (norm(given) === norm(passcode)) {
      return new Response(null, {
        status: 303,
        headers: {
          location: new URL(request.url).pathname,
          "set-cookie": `${COOKIE}=${token}; Path=/viiv; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax`,
          "cache-control": "no-store",
        },
      });
    }
    return new Response(gatePage(true), { status: 401, headers: noStore });
  }

  return new Response(gatePage(false), { status: 401, headers: noStore });
};

export const config = {
  path: ["/viiv", "/viiv/*"],
};
