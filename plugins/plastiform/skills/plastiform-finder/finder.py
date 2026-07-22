#!/usr/bin/env python3
"""Plastiform Finder — thin client to the live form.plastiform.info API.

Contract: form.plastiform.info/docs/api.md (POST /api/calculate, public, deterministic).
The API validates and computes the extraction constraint; this script just maps flags
to the JSON body and prints the response.
"""
import argparse
import json
import os
import sys
import urllib.error
import urllib.request

API = os.environ.get("PLASTIFORM_API_URL", "https://form.plastiform.info")


def calculate(body):
    req = urllib.request.Request(
        f"{API}/api/calculate",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.load(r)


def selftest():
    # The three worked examples from docs/api.md.
    cases = [
        ({"path": "dimensions", "isInnerShape": "outside", "isPartial": "partial",
          "dim": 20, "dmos": 18, "measureSystem": "mm", "isMeasurableWith": "optic"}, "p35"),
        ({"path": "protection", "type": "seal", "applicationType": "single",
          "hasConstraint": "no"}, "f20"),
        ({"path": "reinforcement", "type": "vibration", "isFragile": "yes"}, "m70"),
    ]
    for body, expected in cases:
        r = calculate(body)
        assert {"path", "input", "results"} <= r.keys(), f"bad shape: {sorted(r)}"
        level_one = [p["designation"] for p in r["results"]["levelOne"]]
        assert level_one and level_one[0] == expected, f"{body['path']}: expected {expected} first in {level_one}"
    # api.md dimensions example: constraint echoed back as ceil((1 - 18/20) * 100) = 10
    assert r["input"].get("constraint") is None  # reinforcement has no constraint
    r = calculate(cases[0][0])
    assert r["input"].get("constraint") == 10, f"constraint echo: {r['input'].get('constraint')}"
    print(f"finder selftest: OK (against {API})")


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--selftest", action="store_true", help="verify the api.md examples against the live API")
    p.add_argument("--path", choices=["dimensions", "roughness", "visual", "protection", "reinforcement"])
    p.add_argument("--inner-shape", dest="isInnerShape", choices=["inside", "outside"])
    p.add_argument("--partial", dest="isPartial", choices=["partial", "total"])
    p.add_argument("--dim", type=float, help="largest section the impression occupies")
    p.add_argument("--dmos", type=float, help="smallest passage it must exit through")
    p.add_argument("--unit", dest="measureSystem", choices=["mm", "inch"])
    p.add_argument("--measure-with", dest="isMeasurableWith", choices=["contact", "optic", "both", "eye"])
    p.add_argument("--orientation", choices=["vertical", "horizontal", "top"])
    p.add_argument("--type", choices=["seal", "surface", "temperature", "mask", "caliber",
                                      "vibration", "clamp", "base", "reinforcement"])
    p.add_argument("--application-type", dest="applicationType", choices=["single", "multiple"])
    p.add_argument("--has-constraint", dest="hasConstraint", choices=["yes", "no"])
    p.add_argument("--fragile", dest="isFragile", choices=["yes", "no"])
    args = p.parse_args()

    if args.selftest:
        return selftest()
    if not args.path:
        p.error("--path is required (or use --selftest)")

    body = {k: v for k, v in vars(args).items() if v is not None and k != "selftest"}
    try:
        print(json.dumps(calculate(body), indent=2))
    except urllib.error.HTTPError as e:
        print(e.read().decode())  # the API's error JSON names each bad field
        sys.exit(1)


if __name__ == "__main__":
    main()
