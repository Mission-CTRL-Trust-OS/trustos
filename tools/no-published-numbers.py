#!/usr/bin/env python3
"""Audit: no published Trust Index or driver numbers outside installed projects.

The standing rule (claude/TrustOS-Public-Numbers-Decision-2026-09-01.md):
public surfaces carry a BAND and a PATTERN, never a score. Numbers live only
inside an installed project's real read.

Two deliberate carve-outs, both legitimate:
  - the triangle's centre label >TRUST INDEX<
  - the methodology sentence "the Trust Index runs 0-100", which states the rule

Usage:  python3 tools/no-published-numbers.py [--quiet]
Exit 1 if anything is published that should not be.
"""
import os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

PATS = [
    (r'Trust\s+Index[:\s]+(?:is\s+)?<?[^<>]{0,20}?\b(\d{1,3})\b', 'Trust Index + number'),
    (r'\b(?:Clarity|Connection|Confidence)\s*(?:&mdash;|:|—|-)\s*(\d{1,3})\b', 'driver + number'),
    (r'\b(?:Clarity|Connection|Confidence)\s+(\d{1,3})\b', 'driver + number (bare)'),
    (r'(?:lb-bar-v|ds-score|lb-comp)">\s*(\d{1,3})\s*<', 'numeric readout in graphic'),
    (r'\b(\d{1,3})\s*(?:points?|pts)\s+(?:gap|spread|behind|below|above|ahead)', 'point gap'),
    (r'\b(?:trails?|trailing|lags?|lagging)\s+[^.<]{0,40}?by\s+(?:~|about\s+)?(\d{1,3})\s*points?', 'trails by N points'),
    (r'(?:index|composite|score)\s+of\s+(\d{2,3})\b', 'score of N'),
    # the split-span form the original audit could not see:
    # <span ...>Clarity</span><span ...>65</span>
    (r'>\s*(?:Clarity|Connection|Confidence)\s*</[a-z]+>\s*<[^>]*>\s*(\d{1,3})\s*<', 'driver + number (split tags)'),
    # band boundaries are internal calibration and are never published
    (r'<em>\s*\d{1,3}\s*(?:&ndash;|&mdash;|–|—|-)\s*\d{1,3}\s*</em>', 'band boundary published'),
    (r'(?:Trust position|Trust Index)\s*/\s*100', 'score-out-of-100 label'),
    # Numbers the page only shows once JavaScript runs — invisible to a plain
    # text scan. This is how the whole alignment article got past the audit.
    # A bare count-up with no unit is a TrustOS score. One carrying a prefix or
    # suffix (%, $, B) is third-party evidence, which the rule explicitly allows.
    (r'data-target=["\'](\d{1,3})["\'](?![^>]*data-(?:suffix|prefix))(?!(?:[^<]|<[^>]*>){0,40}[%$])', 'count-up target (bare score)'),
    (r'\+\s*s\.(?:cl|cn|cf|comp)\s*\+', 'driver value concatenated into rendered output'),
    (r'>\s*~?\s*(\d{1,3})\s*(?:pts|points)\s*<', 'point figure rendered as a display number'),
    (r'\b(?:thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)\s+points\b', 'gap figure spelled out'),
    (r'[Cc]omposite scores?\s*0\s*(?:&ndash;|&mdash;|–|—|-)\s*100', 'composite scale published'),
    (r'~\s*(\d{1,3})\s*(?:points|pts)\b', 'approximate point figure'),
    (r'quantified\s+at\b', 'figure announced as quantified'),
]
ALLOW = [
    re.compile(r'Trust Index runs 0(?:&ndash;|&mdash;|–|—|-)100', re.I),
    re.compile(r'>\s*TRUST INDEX\s*<', re.I),
    # The Explorer's own sliders: the visitor's self-rating input, not a
    # TrustOS score. Only the composite result is banded. (Carve-out named in
    # the decision doc.)
    re.compile(r'hc-ic-driver|aria-valuetext="(?:Clarity|Connection|Confidence) \d+ out of 100"|var scores\s*=\s*\{'),
]
SKIP_DIRS = {'.git', 'node_modules', 'Claude outputs'}


def allowed(line):
    return any(a.search(line) for a in ALLOW)


def main():
    quiet = '--quiet' in sys.argv
    violations = []
    scanned = 0
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for fn in filenames:
            if not fn.endswith(('.html', '.js', '.css', '.json', '.xml')):
                continue
            path = os.path.join(dirpath, fn)
            rel = os.path.relpath(path, ROOT)
            scanned += 1
            try:
                lines = open(path, encoding='utf-8', errors='ignore').read().split('\n')
            except Exception:
                continue
            for i, line in enumerate(lines, 1):
                if allowed(line):
                    continue
                for pat, label in PATS:
                    m = re.search(pat, line, re.I)
                    if m:
                        snippet = line.strip()
                        if len(snippet) > 110:
                            start = max(0, m.start() - 45)
                            snippet = '…' + line[start:m.end() + 45].strip() + '…'
                        violations.append((rel, i, label, snippet))
                        break

    by_file = {}
    for rel, i, label, snip in violations:
        by_file.setdefault(rel, []).append((i, label, snip))

    if not quiet:
        for rel in sorted(by_file):
            print('\n%s' % rel)
            for i, label, snip in by_file[rel]:
                print('  L%-5d %-26s %s' % (i, label, snip))

    print('\n%d violations in %d files (%d files scanned)'
          % (len(violations), len(by_file), scanned))
    return 1 if violations else 0


if __name__ == '__main__':
    sys.exit(main())
