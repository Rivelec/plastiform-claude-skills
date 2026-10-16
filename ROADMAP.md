# Roadmap & spec — Claude as a Plastiform engineer

The goal is one thing: **Claude reasons like a Plastiform application engineer.** Given a situation, a
part plan, or a photo, it knows the range and accessories, picks the right product, explains how to apply
it, plans the measurement, and diagnoses a bad impression.

Grounded in this folder: the technical training (`brand/formation-technique-plastiform.md`), the catalog
(`brand/catalog.txt`), and the 24 datasheets (`products_techsheets/`). The competitive brief and media
library are **supporting**, not core.

**Status:** ✅ bootstrapped (in the repo now) · 🔨 to deepen · 🧊 later · 🌐 needs external system.

## The seven capabilities

| # | Capability | Delivered by |
|---|-----------|--------------|
| 1 | Know the products & range | `engineer` skill › `references/products.md` |
| 2 | Accessories & what works with what | `references/accessories.md` (compatibility matrix) |
| 3 | How to apply every product | `references/application.md` |
| 4 | Recognise a product | `references/recognition.md` |
| 5 | Recognise an impression (good/bad) | `references/recognition.md` + `troubleshooting.md` |
| 6 | Strategy | `references/strategies.md` |
| 7 | What product for a situation / part plan | `finder` skill (`finder.py`) |

## Architecture — data first

Accurate, sourced reference data is the product; the skills and agent are thin layers over it.

```
plugins/plastiform/skills/
  plastiform-engineer/        # knowledge brain (progressive disclosure)
    SKILL.md                  # the 3-filter reasoning method + index
    references/*.md           # products, accessories, application, strategies,
                              #   troubleshooting, measurement, recognition, storage
  plastiform-finder/          # deterministic selection tool
    SKILL.md · finder.py      # thin client to the live form.plastiform.info API + self-tested
plugins/plastiform/mcp/
  server.mjs · manifest.json  # MCP server: find_product tool → same API (Code plugin + Desktop .mcpb)
plugins/plastiform/agents/
  plastiform-engineer.md      # ties skill + finder into whole jobs (plan → product → procedure)
```

---

# Component specs

## 1. `plastiform-engineer` — skill ✅

- **Goal.** Be the engineer's knowledge brain: answer any question about products, accessories,
  application, recognition, strategy, measurement, troubleshooting, storage — reasoning across all of
  them at once, from sourced references.
- **Non-goals.** Not the *selection* engine (that's `finder` — this skill explains, it doesn't compute a
  pick). Not marketing/brand copy (`plastiform-brand`). Not a datasheet dump — references load on demand.
- **Inputs.** A natural-language engineering question, optionally a product ref or a photo.
- **Outputs.** A grounded answer citing the relevant reference, with the two hard rules enforced (DN1
  degrease, pull-straight extraction).
- **Example.** *"Why is my F20 impression still tacky?"* → grease / non-homogeneous mix / too cold /
  expired (troubleshooting) → fix: DN1 (never acetone), verify uniform colour on the test drop, work near
  20 °C, check expiry.
- **Files:** `SKILL.md` ✅ + 8 references ✅ (deepen from datasheets over time 🔨).

## 2. `plastiform-finder` — skill + `finder.py` + MCP server ✅

- **Goal.** Deterministically select the product for a concrete situation or a part plan — the *actual*
  engine of `form.plastiform.info`, not a reimplementation. Repeatable and correct, not LLM freehand.
- **How.** Thin clients to the live public API `POST form.plastiform.info/api/calculate` (contract:
  `form.plastiform.info/docs/api.md`). The selection algorithm and product table live server-side —
  nothing here can drift from the site.
  - `finder.py` — stdlib urllib client (Bash path for Claude Code).
  - `mcp/server.mjs` — zero-dep Node stdio MCP server exposing tool **`find_product`** (Claude Code via
    `plugin.json` `mcpServers`; Claude Desktop via `.mcpb` packed from `mcp/`).
- **Non-goals.** Not the explainer (defers specs/accessories/how-to to the `engineer` skill). Not the ~5 %
  atypical cases — empty `levelOne` escalates instead of bluffing. Doesn't read the plan itself (the agent does).
- **Inputs.** `path` (dimensions/roughness/visual/protection/reinforcement) + the api.md fields per path
  (`isInnerShape`, `isPartial`, `dim`/`dmos`/`measureSystem`, `isMeasurableWith`, `orientation`,
  protection/reinforcement `type` fields). `constraint` is auto-derived server-side: `ceil((1 − dmos/dim)×100)`.
- **Outputs (JSON).** `results.levelOne` (ideal, best first), `levelTwo` (alternatives), `cutter`/`case`
  accessory flags. Empty `levelOne` ⇒ strategies (partial impression / void + reinjection) or escalate.
- **Tests.** `python3 finder.py --selftest` asserts the api.md worked examples against the live API
  (loose asserts until the api.md build is deployed to prod). ✅ green.

## 3. `plastiform-engineer` — agent ✅

- **Goal.** Do a whole job end to end: situation / part-plan image / impression photo → product +
  accessories + procedure + measurement plan, or a diagnosis.
- **Non-goals.** Not a replacement for the finder's math (it *calls* finder). Not a Desktop feature —
  Desktop has no subagents, so its reasoning is mirrored in the skill body (see Distribution).
- **Inputs.** Prose, a drawing (reads Dmax/Dmin), or a photo of an impression.
- **Outputs.** Concise, actionable: the product + why, the kit (gun/injector/tip/ring/cutter), the steps
  (DN1 first), the measurement plan; strategy fallback when needed.
- **Example.** *"Photo of an oil & gas tube — measure internal roughness."* → **P80 Ra** (only Ra-by-contact),
  standard injector (no tip on pasty), press with a card, cure ~6 min, measure with a contact rugosimeter.

## 4. Reference pack (under `plastiform-engineer/references/`)

| File | Goal | Non-goal | Status |
|------|------|----------|--------|
| `products.md` | Master table: per product Shore, constraint, elongation, resolution, times, packaging, refs | Not a selection tool | ✅ verified cell-by-cell vs all 22 datasheets (2026-07-22) |
| `accessories.md` | Guns/injectors/cutters/rings/DN1/plastin + **compatibility matrix** | Not application steps | ✅ |
| `application.md` | Degrease → mix → inject → cure → extract, per consistency | Not product selection | ✅ |
| `strategies.md` | Partial impression, void+reinjection, extraction sense, XL | Not routine jobs | ✅ |
| `troubleshooting.md` | Defect → cause → fix | Not measurement method | ✅ |
| `measurement.md` | Instrument per control, positioning, Shore↔contact | Not impression-taking | ✅ |
| `recognition.md` | Decode a ref; colour/consistency cues; good-vs-bad impression | Not a photo classifier (needs image set) | ✅ / 🧊 |
| `storage-traceability.md` | Shelf life, storage, traceability fields | — | ✅ |

## Supporting components (sales/marketing — secondary)

| Type | Name | Goal | Status |
|------|------|------|--------|
| Skill | `plastiform-brand` | Sourcing discipline, never invent | ✅ |
| Agent | `plastiform-copywriter` | Brand-accurate copy | ✅ |
| Skill | `plastiform-media` | Read-only Piwigo client; feeds `recognition.md` with labelled photos | ✅ ported |
| Skills + agent | `affinity-*`, `publication-export-version`, `revue-pdf`, `relecture-multilingue` · `relecteur-independant` | Affinity publishing toolkit for Rivelec documents (catalogue, data sheets): multilingual layouts, centralised data, scripted exports and versions, PDF and translation reviews | ✅ (tested on copies of the 2026 catalogue and data sheets) |
| Skill | `plastiform-competitor` | "Microset 101 THS → equivalent" + verified corrections | ✅ (matrix validated 2026-07-15; kept **out of this public repo** — internal pricing) |

## Serving both Claude Code and Claude Desktop

**Two install systems — Desktop doesn't read a Claude Code marketplace.** One shared logic, two front doors.

| | Claude Code | Claude Desktop / claude.ai |
|--|--|--|
| Install | plugin marketplace | `.mcpb` extension + per-account Skills |
| Skills | ✅ from the plugin | enable on the claude.ai account (runs in Anthropic's sandbox) |
| Agents | ✅ | ❌ fold the agent's reasoning into the skill body |
| Finder | `find_product` MCP tool (plugin) or `finder.py` via Bash ✅ | `.mcpb` MCP tool `find_product` (pack from `mcp/`) ✅ |

The `engineer` **agent** is Code-only; on Desktop its workflow must live inside the `engineer` **skill**
body so a Desktop user gets the same behaviour. Keep tool/skill names identical across both.

## Build order — what's done, what's left

1. ✅ `finder.py` + self-check · `finder` skill.
2. ✅ `products.md` (master table) · `accessories.md` · `application.md`.
3. ✅ `engineer` skill + remaining references · `engineer` agent.
4. 🔨 Verify `products.md` against each of the 24 datasheet PDFs (currently sourced via research §1.2).
5. ✅ Port `plastiform-media`; wired into `recognition.md` (`shot:replica` queries for photo comparison).
6. ✅ Live `form.plastiform.info` client (`finder.py` + MCP `find_product`) · Desktop `.mcpb`
   (`npx @anthropic-ai/mcpb pack plugins/plastiform/mcp plastiform-finder.mcpb`). `search_media` stays 🧊.
7. ✅ Vendor-pattern port (`docs/architecture-port-plan.md`): `scripts/lint.py` + `drift_check.py`
   (Microsoft drift pipeline, scaled down) · `scripts/build_dist.py` (Vercel compiled build →
   standalone claude.ai/Desktop engineer skill, solves the "fold agent into skill body" rule above).

## Deliberately NOT separate components

- **One knowledge skill, not eight.** Accessories/application/strategy/etc. are **reference files** under
  `plastiform-engineer` (progressive disclosure) — the engineer reasons across them together.
- **Finder stays separate** from the knowledge skill — deterministic tool vs. explanation.
- **Datasheet table folds into `products.md`**; a second copy would drift from the FTEs. The finder holds
  **no product table at all** — it's a thin client, the table lives server-side at `form.plastiform.info`.
