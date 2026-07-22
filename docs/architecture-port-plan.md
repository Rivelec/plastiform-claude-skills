# Porting big-vendor skill-repo architecture — plan

Analysis of `vercel-labs/agent-skills`, `MicrosoftDocs/Agent-Skills`, `anthropics/skills`
(2026-07-22), and what to port into this repo. Baseline: whole plugin = 41 KB ≈ **10k tokens
total**, always-on metadata ≈ **400 tokens** (3 skill descriptions + 2 agent descriptions).

## What the top repos actually do

| Pattern | Vercel | Microsoft | Anthropic |
|---------|--------|-----------|-----------|
| 3-level progressive disclosure (≈100-tok metadata → SKILL.md < 5k tok → resources on demand) | ✅ | ✅ | ✅ (defines it) |
| SKILL.md = **index with impact priorities**, detail in per-rule files (`rules/async-parallel.md`), kebab-case + category prefixes | ✅ core idea | | |
| **Compiled single-file build** (`AGENTS.md`) for consumers without progressive disclosure | ✅ | | |
| **Knowledge pre-compiled from canonical source** + automated re-crawl/delta detection (never hand-maintain what a pipeline can extract) | | ✅ core idea | |
| **Network integration**: fetch live docs/APIs on demand instead of bundling content | | ✅ | |
| Scripts over prose for deterministic work; self-tests | ✅ CI | | ✅ |
| Multi-ecosystem manifests from one repo (Copilot `plugin.json`, `.claude-plugin/`, `.codex-plugin/`, agentskills.io standard) | | ✅ | |
| ❌ incorrect / ✅ correct example pairs per rule | ✅ | | ✅ |
| Rules/skills **prioritized by impact** (CRITICAL → LOW) so the agent triages | ✅ | | |

## Where we already comply (no work)

- Progressive disclosure: descriptions → SKILL.md (700–950 tok) → 8 references (350–1,350 tok each), one level deep.
- Routing table: engineer SKILL.md "Where to look" already maps question → exact reference.
- Scripts over prose + self-test: `finder.py --selftest`, MCP `find_product`.
- Single deterministic source: selection logic lives server-side (form.plastiform.info API), zero drift possible.
- **Do NOT port Vercel's per-rule file splitting** — our references are already smaller than their category files; splitting 1 KB files adds navigation tokens instead of saving them.
- **Do NOT port role bundles / 19-category taxonomy** — meaningful at 193 skills, noise at 4.

## The plan — 4 phases, by impact

### Phase 1 — Free token wins (≈ 1 h) `IMPACT: HIGH`

1. **"API data is already in context" rule** (Microsoft network-integration pattern).
   Every `find_product` response carries the product's full `data` block (Shore, constraint,
   cuttable, contact, work/cure times). Add one line to `plastiform-finder/SKILL.md` §After
   selection and to the engineer agent step 3: *"the find_product response already contains the
   product's technical data block — only open `products.md` for what the API doesn't return
   (elongation, density, resolution, packaging, order refs, PMUC)."*
   Saves a ~1,350-token `products.md` load on most selection jobs.
2. **Trim skill descriptions to ≤ 250 chars** (Anthropic ~100-tok metadata budget).
   `plastiform-finder` is 440 chars; keep the trigger phrase ("Use to select…"), cut the
   mechanics (they're in the body). Target: always-on metadata ≈ 300 tokens for the plugin.
3. **Slim `products.md` header duplication**: the API-owned columns stay (they're the offline
   copy) but drop prose that re-explains what the finder already reports.

### Phase 2 — Drift detection (≈ half a day) `IMPACT: HIGH` (Microsoft's core pattern, scaled down)

Canonical sources: the live API's product `data` blocks (deployed truth) and the 24 datasheet
PDFs. `products.md` is hand-typed between them — with known catalog typos already annotated.

4. **`scripts/drift_check.py`** (stdlib, ~80 lines): pulls every product `data` block from the
   API (collect designations from a sweep of representative `find_product` calls), normalizes
   designations (`F30 Visual` ↔ `f30-visual`), compares the overlapping fields against
   `references/products.md` (Shore, max constraint, cuttable, contact, work/set times in
   seconds), prints a diff table. Exit 1 on mismatch.
   This is Microsoft's re-crawl/delta pipeline reduced to one script — run it manually after
   any site deploy, or wire it later into CI (🧊 until the repo has CI at all).
5. **`scripts/lint.py`** (stdlib, ~40 lines) — the CI-lint both vendors run, scaled down:
   every `references/*.md` appears in the engineer routing table; every SKILL.md description
   ≤ 1024 chars; SKILL.md bodies < 500 lines; every product ref mentioned in any reference
   exists in `products.md`'s table. One command, exit code, no framework.

### Phase 3 — Compiled distribution build (≈ half a day) `IMPACT: MEDIUM` (Vercel's AGENTS.md pattern)

Solves the open ROADMAP item "fold the agent's reasoning into the skill body for Desktop /
claude.ai" — mechanically, instead of hand-maintaining a second copy that drifts.

6. **`scripts/build_dist.py`** (stdlib, ~60 lines): concatenates
   `engineer SKILL.md + agent workflow (verbatim section) + all references` →
   `dist/plastiform-engineer-standalone/SKILL.md` (one uploadable claude.ai/Desktop skill,
   ≈ 6k tokens — under the 5k-per-SKILL.md guidance is impossible here, so it emits the
   references as sibling files in the folder, preserving progressive disclosure on claude.ai
   which supports multi-file skills), plus an `AGENTS.md` at repo root for Copilot/Cursor
   users who read that convention.
   `dist/` goes in `.gitignore`; README gets the one-liner.

### Phase 4 — Reference hardening (ongoing, opportunistic) `IMPACT: MEDIUM-LOW`

7. **❌/✅ pairs for the top field mistakes only** (Vercel rule format): acetone degrease,
   unscrewing a threaded impression, overstated `dmos`, fluid product on an external form.
   One pair each, added to `troubleshooting.md` / `application.md`. Not for every fact —
   token cost grows linearly, value doesn't.
8. **Impact tags in the engineer routing table** (Vercel priority tiers): mark the two rows
   that prevent destroyed parts/impressions (`troubleshooting`, `strategies`) as **read first
   when diagnosing**. One column, no restructure.

### Deferred (YAGNI until someone asks)

- **Multi-ecosystem manifests** (`.codex-plugin/`, Copilot `plugin.json`, agentskills.io
  compliance files): our SKILL.md format is already the standard; ship extra manifests only
  when a team member actually uses Copilot/Codex/Cursor. `build_dist.py`'s AGENTS.md output
  covers the informal case.
- **Automated weekly crawl**: `drift_check.py` run by hand covers a 24-product catalog; cron
  it only if the range starts changing monthly.
- **Skill-testing-with-subagents eval suite**: heavyweight; `lint.py` + `finder.py --selftest`
  are the right-sized checks for this repo today.

## Verification

- Phase 1: `wc -c` on descriptions (≤ 250 chars); ask a selection question end-to-end and
  confirm `products.md` is not opened when the API block suffices.
- Phase 2: `python3 scripts/drift_check.py` green against live prod; introduce a fake typo in
  `products.md` → exits 1 with a diff row. Same negative test for `lint.py`.
- Phase 3: `python3 scripts/build_dist.py` → upload `dist/plastiform-engineer-standalone/` to
  a claude.ai account, ask one engineer question + one selection question, confirm behaviour
  matches Claude Code.
- Phase 4: troubleshooting question → answer cites the ❌/✅ pair.
