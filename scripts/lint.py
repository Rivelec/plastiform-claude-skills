#!/usr/bin/env python3
"""Structure lint for the plastiform plugin — the CI checks Vercel/Microsoft run, scaled down.

Checks: every reference file is routed from the engineer SKILL.md; frontmatter descriptions
exist and fit budgets (hard 1024 chars, warn > 300); SKILL.md bodies < 500 lines; every
product ref mentioned anywhere exists in products.md's master table.
"""
import glob
import os
import re
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLUGIN = os.path.join(REPO, "plugins/plastiform")
ENGINEER = os.path.join(PLUGIN, "skills/plastiform-engineer")
errors, warns = [], []

# 1. Routing table covers every reference file
skill = open(os.path.join(ENGINEER, "SKILL.md")).read()
for ref in sorted(glob.glob(os.path.join(ENGINEER, "references", "*.md"))):
    if os.path.basename(ref) not in skill:
        errors.append(f"references/{os.path.basename(ref)} not routed in engineer SKILL.md")

# 2. Descriptions + body budgets
for path in sorted(glob.glob(os.path.join(PLUGIN, "skills", "*", "SKILL.md"))):
    text = open(path).read()
    m = re.search(r"^description:\s*(.+)$", text, re.M)
    rel = os.path.relpath(path, PLUGIN)
    if not m:
        errors.append(f"{rel}: missing description")
        continue
    n = len(m.group(1))
    if n > 1024:
        errors.append(f"{rel}: description {n} chars (max 1024)")
    elif n > 300:
        warns.append(f"{rel}: description {n} chars (aim ≤ 300)")
    lines = text.count("\n")
    if lines >= 500:
        errors.append(f"{rel}: {lines} lines (keep SKILL.md < 500)")

# 3. Every product ref mentioned exists in products.md
known = set()
for line in open(os.path.join(ENGINEER, "references/products.md")):
    if line.startswith("| **"):
        known.add(re.match(r"\| \*\*([FPM]\d+)", line).group(1).lower())
ref_pat = re.compile(r"\b([FPMfpm]\d{2,3})\b")
for path in sorted(glob.glob(os.path.join(PLUGIN, "**", "*.md"), recursive=True)):
    for tok in ref_pat.findall(open(path).read()):
        if tok.lower() not in known:
            errors.append(f"{os.path.relpath(path, PLUGIN)}: unknown product ref '{tok}'")

for w in warns:
    print(f"warn: {w}")
for e in errors:
    print(f"LINT: {e}")
print(f"lint: {len(errors)} errors, {len(warns)} warnings")
sys.exit(1 if errors else 0)
