#!/usr/bin/env python3
"""Verify the screen mockups hang together.

    python3 Design/mockups/check-links.py

Checks that every href resolves to a file that exists, that every page is
reachable by clicking from index.html, that every row wired to the detail
panel has a matching template, and that each page carries the full sidebar
with ADMINISTRATION at its foot. Exits non-zero on any failure.
"""
import pathlib, re, sys
D = pathlib.Path(__file__).parent
files = sorted(f for f in D.glob("*.html"))
names = {f.name for f in files}
src = {f.name: f.read_text() for f in files}
fail = []

print("=" * 78)
print("1. LINK TARGETS — every href resolves to a file that exists")
print("=" * 78)
total = 0
for n in sorted(src):
    hrefs = sorted(set(re.findall(r'href="([^"#][^"]*)"', src[n])))
    local = [h for h in hrefs if not h.startswith("http")]
    bad = [h for h in local if h not in names]
    total += len(local)
    print(f"  {n:24} {len(local):3} links" + ("" if not bad else f"  BROKEN: {bad}"))
    if bad: fail.append(f"{n}: broken links {bad}")
print(f"  {'':24} {total:3} total, {len(fail)} broken")

print()
print("=" * 78)
print("2. REACHABILITY — can you get to every page by clicking from index.html?")
print("=" * 78)
graph = {n: {h for h in re.findall(r'href="([^"#][^"]*)"', s) if h in names} for n, s in src.items()}
seen, queue = {"index.html"}, ["index.html"]
while queue:
    for t in graph[queue.pop()]:
        if t not in seen:
            seen.add(t); queue.append(t)
for n in sorted(names):
    inbound = sorted(o for o in graph if n in graph[o] and o != n)
    mark = "ok  " if n in seen else "UNREACHABLE"
    print(f"  {mark} {n:24} inbound from: {', '.join(x[:2] for x in inbound) or '(none)'}")
    if n not in seen: fail.append(f"{n} unreachable from index")

print()
print("=" * 78)
print("3. DETAIL PANEL — every wired row has a template, every template is wired")
print("=" * 78)
for n in sorted(src):
    s = src[n]
    rows = re.findall(r'data-detail="([^"]+)"', s)
    tpls = re.findall(r'<template id="([^"]+)"', s)
    missing = [r for r in rows if r not in tpls]
    orphan  = [t for t in tpls if t not in rows]
    has_js  = "<script>" in s
    has_dr  = 'class="drawer"' in s
    flag = ""
    if missing: flag += f" MISSING TEMPLATE {missing}"; fail.append(f"{n}: {missing}")
    if orphan:  flag += f" ORPHAN TEMPLATE {orphan}";  fail.append(f"{n}: orphan {orphan}")
    if rows and not (has_js and has_dr):
        flag += " NO DRAWER/JS"; fail.append(f"{n}: rows but no drawer")
    print(f"  {n:24} {len(rows):2} rows -> {len(tpls):2} templates  drawer={has_dr} js={has_js}{flag}")

print()
print("=" * 78)
print("4. NAVIGATION — the five sidebar entries present and pointing at real files")
print("=" * 78)
NAV = {"Overview":"01-overview.html","Account groups":"02-groups.html","Accounts":"04-accounts.html",
       "Record posting":"08-record-posting.html","Currencies":"09-currencies.html"}
for n in sorted(src):
    if n == "index.html": continue
    s = src[n]
    missing = [l for l, t in NAV.items() if f'href="{t}"' not in s or f'>{l}</a>' not in s]
    # compare inside the sidebar markup, not the stylesheet above it
    side = re.search(r'<div class="side">.*?<div class="main">', s, re.S)
    side = side.group(0) if side else ""
    admin_last = (side.find('class="navgroup navgroup-admin"') > side.find('class="navgroup">') > -1
                  and side.rfind("ADMINISTRATION") > side.rfind("LEDGER"))
    brand = "Bank Accounts" in s
    flag = ""
    if missing: flag += f" MISSING NAV {missing}"; fail.append(f"{n}: nav {missing}")
    if not admin_last: flag += " ADMIN NOT LAST"; fail.append(f"{n}: admin not last")
    if not brand: flag += " WRONG BRAND"; fail.append(f"{n}: brand")
    print(f"  {n:24} nav=5/5 admin-at-foot={admin_last} brand-ok={brand}{flag}")

print()
print("=" * 78)
print("RESULT:", "ALL CHECKS PASS" if not fail else f"{len(fail)} FAILURE(S)")
for f_ in fail: print("  -", f_)
sys.exit(1 if fail else 0)
