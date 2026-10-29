#!/usr/bin/env python3
"""Keep sitemap.xml <lastmod> dates honest.

Every <lastmod> is set from the real last-change date of the file that serves
that URL (git commit date, falling back to filesystem mtime for files git has
never seen). Stale lastmod dates tell Google nothing changed, so it stops
recrawling — which is exactly what happened to the sector POV pages between
June and October 2026.

Usage:
    python3 tools/sitemap-lastmod.py            # rewrite sitemap.xml in place
    python3 tools/sitemap-lastmod.py --check    # report drift, change nothing
                                                # (exit 1 if anything is stale)

Run it before every deploy that touches page content, then resubmit the
sitemap in Search Console.
"""
import os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITEMAP = os.path.join(ROOT, "sitemap.xml")
# URL prefixes deliberately kept out of the sitemap (gated client work, opt-out page)
EXCLUDED_PREFIXES = ("/navigator/", "/viiv/", "/notrack/", "/proposals/", "/agreements/")
# Files that are never sitemap material
EXCLUDED_NAMES = ("/404", "/404/")


def git_date(path):
    try:
        out = subprocess.run(
            ["git", "-C", ROOT, "log", "-1", "--format=%ad", "--date=short", "--", path],
            capture_output=True, text=True, timeout=20,
        )
        d = out.stdout.strip()
        if d:
            return d
    except Exception:
        pass
    try:
        import datetime
        ts = os.path.getmtime(os.path.join(ROOT, path))
        return datetime.date.fromtimestamp(ts).isoformat()
    except Exception:
        return None


def path_for(url_path):
    """Map a URL path to the file that serves it."""
    p = url_path.strip("/")
    if not p:
        return "index.html"
    for candidate in (os.path.join(p, "index.html"), p + ".html", p):
        if os.path.isfile(os.path.join(ROOT, candidate)):
            return candidate
    return None


def is_noindex(rel_path):
    """A page that tells robots noindex has no business in a sitemap."""
    try:
        head = open(os.path.join(ROOT, rel_path), encoding="utf-8", errors="ignore").read(4000)
    except Exception:
        return False
    m = re.search(r'<meta\s+name=["\']robots["\'][^>]*content=["\']([^"\']*)', head, re.I)
    return bool(m) and "noindex" in m.group(1).lower()


def canonical_of(rel_path):
    """The URL a page declares for itself. The two sites use different
    conventions (TrustOS: trailing slash; the agency site: extensionless),
    so the page's own canonical is the only safe source of truth."""
    try:
        head = open(os.path.join(ROOT, rel_path), encoding="utf-8", errors="ignore").read(6000)
    except Exception:
        return None
    m = re.search(r'<link[^>]+rel=["\']canonical["\'][^>]+href=["\']([^"\']+)', head, re.I)
    if not m:
        m = re.search(r'<link[^>]+href=["\']([^"\']+)["\'][^>]+rel=["\']canonical["\']', head, re.I)
    if not m:
        return None
    return re.sub(r"^https?://[^/]+", "", m.group(1)) or "/"


def public_pages():
    found = set()
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in (".git", "node_modules", "tools", "netlify")]
        for fn in filenames:
            if not fn.endswith(".html"):
                continue
            rel = os.path.relpath(os.path.join(dirpath, fn), ROOT)
            if is_noindex(rel) or fn.startswith("google") and fn.endswith(".html"):
                continue
            canon = canonical_of(rel)
            if canon:
                found.add(canon)
                continue
            url = "/" + rel[: -len("index.html")] if rel.endswith("index.html") else "/" + rel[:-5]
            if url != "/" and not url.endswith("/") and os.path.isfile(
                os.path.join(ROOT, rel[:-5], "index.html")
            ):
                url += "/"
            found.add(url if url.startswith("/") else "/" + url)
    return found


def main():
    check = "--check" in sys.argv
    if not os.path.isfile(SITEMAP):
        print("no sitemap.xml at", SITEMAP)
        return 1
    xml = open(SITEMAP, encoding="utf-8").read()

    blocks = list(re.finditer(r"<url>.*?</url>", xml, re.S))
    changed, missing_file, mismatches, in_sitemap = [], [], [], set()
    new_xml = xml

    for b in blocks:
        block = b.group(0)
        m_loc = re.search(r"<loc>\s*([^<]+?)\s*</loc>", block)
        if not m_loc:
            continue
        loc = m_loc.group(1)
        url_path = re.sub(r"^https?://[^/]+", "", loc) or "/"
        in_sitemap.add(url_path)
        fp = path_for(url_path)
        if not fp:
            missing_file.append(url_path)
            continue
        canon = canonical_of(fp)
        if canon and canon != url_path:
            mismatches.append((url_path, canon))
        true_date = git_date(fp)
        if not true_date:
            continue
        m_mod = re.search(r"<lastmod>\s*([^<]*?)\s*</lastmod>", block)
        current = m_mod.group(1) if m_mod else None
        if current == true_date:
            continue
        changed.append((url_path, current or "(none)", true_date))
        if m_mod:
            updated = block.replace(m_mod.group(0), "<lastmod>%s</lastmod>" % true_date)
        else:
            updated = block.replace(m_loc.group(0), m_loc.group(0) + "\n    <lastmod>%s</lastmod>" % true_date)
        new_xml = new_xml.replace(block, updated)

    for url, was, now in changed:
        print("  %-52s %s -> %s" % (url, was, now))
    for url in missing_file:
        print("  !! in sitemap, no file on disk: %s" % url)
    for url, canon in mismatches:
        print("  !! sitemap says %s but the page's canonical is %s" % (url, canon))
    orphans = sorted(
        u for u in public_pages() - in_sitemap
        if not u.startswith(EXCLUDED_PREFIXES) and u not in EXCLUDED_NAMES
    )
    for u in orphans:
        print("  ?? public page not in sitemap: %s" % u)

    if check:
        print("%d stale, %d missing files, %d canonical mismatches, %d pages absent from sitemap"
              % (len(changed), len(missing_file), len(mismatches), len(orphans)))
        return 1 if changed else 0

    if changed:
        open(SITEMAP, "w", encoding="utf-8").write(new_xml)
        print("updated %d lastmod dates in sitemap.xml" % len(changed))
    else:
        print("sitemap.xml already accurate")
    return 0


if __name__ == "__main__":
    sys.exit(main())
