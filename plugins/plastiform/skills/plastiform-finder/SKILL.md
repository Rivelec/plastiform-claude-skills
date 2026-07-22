---
name: plastiform-finder
description: Use to select the right Plastiform product for a situation or a part plan — dimensions / roughness / visual / protection / reinforcement, via the live form.plastiform.info Finder API (MCP tool find_product, or finder.py). Don't pick a product by hand — run this.
---

# Plastiform Finder

Deterministic product selection via the live `form.plastiform.info` Finder API — the exact engine
behind the public wizard. Contract: `POST /api/calculate` (public, no auth), documented in
form.plastiform.info's `docs/api.md`. It covers ~95% of field situations.

## Run it

**Preferred:** the `find_product` MCP tool (from the `plastiform-finder` MCP server) — pass the
fields below directly as tool arguments.

**Fallback (Bash):** `finder.py` in this skill's directory — same fields as flags. Never use curl
for this API in this environment (output gets filtered); use the tool or finder.py.

```bash
python3 finder.py --path dimensions --inner-shape inside --partial total \
  --dim 16 --dmos 14 --unit mm --measure-with both
python3 finder.py --path protection --type seal --application-type single --has-constraint no
python3 finder.py --path reinforcement --type vibration --fragile yes
python3 finder.py --selftest    # re-verifies the api.md examples against the live API
```

`PLASTIFORM_API_URL` overrides the base URL (both tool and script) to hit a dev server.

## The 5 paths

| `path` | Use case | Fields that apply |
|--------|----------|-------------------|
| `dimensions` | dimensional impression / part measurement | `isInnerShape`, `isPartial`, `dim`, `dmos`, `measureSystem`, `isMeasurableWith` (contact\|optic\|both) |
| `roughness` | surface roughness capture | `isInnerShape`, `dim`, `dmos`, `measureSystem`, `isMeasurableWith` (contact\|optic\|both) |
| `visual` | visual defect capture | `isInnerShape`, `dim`, `dmos`, `measureSystem`, `isMeasurableWith` (**eye**\|optic), `orientation` |
| `protection` | masking / seal / calibration | `type` (seal\|surface\|temperature\|mask\|caliber), `applicationType`, `hasConstraint` (+ dim/dmos/unit if yes) |
| `reinforcement` | stabilization / support | `type` (vibration\|clamp\|base\|reinforcement), `isFragile` |

Never send `constraint` — the API derives it: `ceil((1 − dmos/dim) × 100)`. A 400 response names
each missing/bad field under `details` — fix those fields and retry.

## Reading dim/dmos off a part plan

- **dim** = the largest section the impression will occupy (the bigger number).
- **dmos** = the smallest passage it must pass through to be extracted.
- Several restrictions → compute each pair and keep the **highest** constraint.

This is the one error-prone step. An overstated dmos picks a product too rigid that jams on
extraction — double-check both numbers against the drawing.

## Reading the result

- `results.levelOne` — ideal product(s), best first. `levelTwo` — up to 2 alternatives.
- `cutter` / `case` booleans — accessories recommended (the cutter is also appended to levelOne).
- **`levelOne` empty = no standard product fits.** That's not "impossible" — reach for a strategy
  from the `plastiform-engineer` skill (`references/strategies.md`): a **partial impression**
  (kills the constraint) or a **temporary void + reinjection**. The atypical ~5% escalate to a
  Plastiform engineer via plastiform.info.

## After selection

The response's `data` block **already contains** the product's technical data — Shore hardness,
max constraint, cuttable, contact-measurable, working/curing times. Don't re-open `products.md`
for those. For the rest (elongation, density, resolution, packaging, order refs), the accessories
it needs, and how to apply it, use the **`plastiform-engineer`** skill (`references/products.md`,
`accessories.md`, `application.md`).
