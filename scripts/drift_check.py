#!/usr/bin/env python3
"""Drift check: references/products.md vs the Finder's canonical products.json.

products.md is hand-typed from the datasheets; products.json is what form.plastiform.info
actually deploys. Hard-fails (exit 1) on Shore/constraint drift — the typo-prone numbers the
finder's logic depends on. Cutter/contact/time diffs print as warnings: the datasheet carries
nuance ("contact possible") that the engine flattens to a boolean.

# ponytail: reads the form repo's products.json directly — the API has no list endpoint.
"""
import json
import os
import re
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MD = os.path.join(REPO, "plugins/plastiform/skills/plastiform-engineer/references/products.md")
FORM = os.environ.get("FORM_REPO", os.path.join(REPO, "..", "..", "form.plastiform.info"))
PRODUCTS_JSON = os.path.join(FORM, "app/src/assets/products.json")

SPECIAL = {"f04-protect": "f04"}  # md name -> json designation


def md_rows():
    for line in open(MD):
        if not line.startswith("| **"):
            continue
        cols = [c.strip() for c in line.split("|")][1:-1]
        ref = cols[0].strip("* ")
        name = ref.lower().replace(" ", "-")
        yield SPECIAL.get(name, name), {
            "shore": cols[2], "constraint": cols[4],
            "work": cols[8], "set": cols[9], "measure": cols[12], "cutter": cols[13],
        }


def mmss(s):
    m = re.match(r"(\d+):(\d+)$", s)
    return int(m.group(1)) * 60 + int(m.group(2)) if m else None


def main():
    if not os.path.exists(PRODUCTS_JSON):
        sys.exit(f"products.json not found at {PRODUCTS_JSON} — set FORM_REPO")
    products = {p["designation"]: p["data"] for p in json.load(open(PRODUCTS_JSON))}
    hard, warn = [], []

    for name, md in md_rows():
        data = products.get(name)
        if data is None:
            warn.append(f"{name}: in products.md but not in the Finder (custom/bespoke?)")
            continue
        if data.get("type") == "accessory":
            continue  # json carries no technical data for accessories

        m = re.match(r"(\d+)(?:±(\d+))?\s*Sh([AD])", md["shore"])
        if m and m.group(3) == "A":  # ShD (P51 SD) uses another scale than json's number
            base, tol = int(m.group(1)), int(m.group(2) or 0)
            if abs(data["finalHardness"] - base) > tol:
                hard.append(f"{name}: Shore md {md['shore']} vs finder {data['finalHardness']}")

        c = re.match(r"(\d+)\s*%", md["constraint"])
        if c and int(c.group(1)) != data["constraint"]:
            hard.append(f"{name}: max constraint md {c.group(1)}% vs finder {data['constraint']}%")

        md_cut = {"Yes": True, "No": False}.get(md["cutter"])
        if md_cut is not None and md_cut != data["isCuttable"]:
            warn.append(f"{name}: cutter md {md['cutter']} vs finder {data['isCuttable']}")
        md_contact = "non-contact" not in md["measure"] and "not for" not in md["measure"]
        if md_contact != data["canBeMeasuredWithContact"]:
            warn.append(f"{name}: contact md '{md['measure']}' vs finder {data['canBeMeasuredWithContact']}")
        for col, key in (("work", "workingTime"), ("set", "curingTime")):
            secs = mmss(md[col])
            if secs is not None and secs != data[key]:
                warn.append(f"{name}: {key} md {md[col]} ({secs}s) vs finder {data[key]}s")

    for w in warn:
        print(f"warn: {w}")
    for h in hard:
        print(f"DRIFT: {h}")
    print(f"drift check: {len(hard)} hard, {len(warn)} warnings, "
          f"{len(list(md_rows()))} md rows vs {len(products)} finder products")
    sys.exit(1 if hard else 0)


if __name__ == "__main__":
    main()
