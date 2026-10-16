# Plastiform — Claude Code marketplace

A [Claude Code plugin marketplace](https://code.claude.com/docs/en/plugin-marketplaces)
for Plastiform (a trademark of Rivelec). It distributes **skills, agents and MCP**
for working on Plastiform, installable in one command.

**Goal:** make Claude reason like a Plastiform application engineer — know the range and accessories,
pick the right product for a situation or a part plan, explain how to apply it, and diagnose a bad
impression. See [`ROADMAP.md`](./ROADMAP.md) for the plan. The components below are what's built today.

## Install

In any Claude Code session:

```
/plugin marketplace add Rivelec/plastiform-claude-skills
/plugin install plastiform@plastiform-skills
```

The repo is public — no GitHub auth needed. A local-path add also works:
`/plugin marketplace add /path/to/plastiform-claude-skills`. The competitor-equivalence
skill (internal pricing/mapping data) is deliberately **not** in this repo — it is
distributed privately.

Update later with `/plugin marketplace update plastiform-skills`.

### Claude Desktop users

Desktop doesn't read this marketplace. It installs an **`.mcpb` extension** (Settings → Extensions)
plus per-account **Skills** enabled on claude.ai. To build the Finder extension:

```bash
npx @anthropic-ai/mcpb pack plugins/plastiform/mcp plastiform-finder.mcpb
```

then drag `plastiform-finder.mcpb` into Desktop → Settings → Extensions.

## What's inside

| Type  | Name                    | Does |
|-------|-------------------------|------|
| Skill | `plastiform-engineer`   | The knowledge brain: products, accessories, application, strategy, troubleshooting (8 references). |
| Skill | `plastiform-finder`     | Deterministic product selection via the live `form.plastiform.info` API (`finder.py`). |
| MCP   | `plastiform-finder`     | `find_product` tool → live Finder API. Ships enabled in `plugin.json`; also packs as `.mcpb` for Desktop. |
| Agent | `plastiform-engineer`   | Whole jobs end to end: situation/plan/photo → product + kit + procedure + measurement plan. |
| Skill | `plastiform-media`      | Read-only Piwigo client for media.plastiform.info — fuzzy FR/EN search, faceted tags, photo comparison sets. |
| Skill | `plastiform-brand`      | Enforces sourcing every fact from the brand knowledge base; never invent product/offer details. |
| Agent | `plastiform-copywriter` | Writes/reviews brand-accurate Plastiform copy, flags `[NEEDS SOURCE]` gaps. |
| Skill | `gemini-writer`         | Puts already-decided content into words with Gemini 3.1 Pro (OpenRouter), the way a Rivelec employee writes: mail, blog article, product page, LinkedIn post. Decides neither content nor technique; checks form and flags figures not in the brief. Needs `node` ≥ 18 and an OpenRouter key (`OPENROUTER_API_KEY` or `~/.config/openrouter/key`). |
| Skill | `affinity-pilotage`     | Base of the Affinity publishing toolkit (French): drives Affinity by Canva from Claude — Affinity MCP, launcher, `_Outils_Affinity` tools, SDK notes, verified pitfalls. The skills below build on it. |
| Skill | `affinity-nouveau-projet` | New multilingual Affinity project: shared BASE linked under every spread + one file per language, linked images only, `projet.json`, export scripts. |
| Skill | `affinity-migration`    | Brings an existing Affinity file or project into that structure, with before/after renders. |
| Skill | `affinity-sante-projet` | Read-only health check of a project's `.af` files (links, images, fonts, overflowing text, stale exports), report by severity. |
| Skill | `affinity-textes-langues` | Text corrections that keep the formatting: JSON rules, simulation then application, per-language typography. |
| Skill | `affinity-donnees-centralisees` | Prices and repeated values in one data file (JSON / Excel), pushed to every language. |
| Skill | `publication-export-version` | Scripted PDF exports (every variant, or one PDF per data sheet), versions, CHANGELOG, PDF checks and diffs. |
| Skill | `revue-pdf`             | Review of exported PDFs: automatic checks, diff with the previous version, visual and content review, severity report. |
| Skill | `relecture-multilingue` | Translation review against the French reference: alignment, numbers, glossary, decision page (QCM), application. |
| Agent | `relecteur-independant` | Independent reviewer of exported PDFs that has not seen the work (so the work doesn't grade itself). |
| MCP   | `.mcp.example.json`     | Template for optional extra MCP servers (filesystem, scoped to brand knowledge). |

## MCP servers

The **`plastiform-finder`** server ships enabled inline in `plugin.json` — zero config; it only
needs `node` ≥ 18 on PATH. If node is missing the server shows failed in `/mcp` but every skill
keeps working (`finder.py` is the fallback).

Optional extra servers stay a **template**, not a live config, so a broken one can't break the
install. To enable them:

```bash
cp plugins/plastiform/.mcp.example.json plugins/plastiform/.mcp.json
export PLASTIFORM_BRAND_KNOWLEDGE_DIR=/path/to/.specify/memory/brand-knowledge
```

Edit `.mcp.json` for the server(s) you actually want (Woo/Piwigo/etc.), then reinstall.
`.mcp.json` is git-ignored so machine-specific paths don't get committed.

## Affinity publishing toolkit

The `affinity-*`, `publication-export-version`, `revue-pdf` and `relecture-multilingue` skills are written in
French (Rivelec's catalogue and data-sheet workflows). They drive **Affinity by Canva** on the user's Mac through
the Affinity MCP server (Affinity › Settings › MCP) and the Claude desktop app's link to the computer. Their tools
live in `plugins/plastiform/skills/affinity-pilotage/outils/` — the reference copy of what is installed on the Mac in
`~/Desktop/Cowork/_Outils_Affinity`: JavaScript run inside Affinity, standalone publishing scripts (also saved in
Affinity's script library), Python checks. Install / update: `affinity-pilotage/references/environnement.md`.

## "Anthropic store"?

Anthropic's official first-party marketplace names (`anthropic-plugins`, `agent-skills`, …)
are **reserved** and can't be used by third parties. The supported path to a "store"-like
experience is exactly this repo: **host it on GitHub and share the two install commands** —
that's how community/team marketplaces are distributed. To publish:

```bash
cd plastiform-claude-skills
git init && git add -A && git commit -m "Plastiform marketplace v0.1.0"
gh repo create plastiform-claude-skills --public --source=. --push
```

## Adding more

- **New skill:** `plugins/plastiform/skills/<name>/SKILL.md`
- **New agent:** `plugins/plastiform/agents/<name>.md`
- **New plugin:** add a folder under `plugins/` and a new entry in `.claude-plugin/marketplace.json`.

Bump `version` in `marketplace.json` / `plugin.json` when you ship changes.

## Maintenance & builds

```bash
python3 scripts/lint.py         # structure lint: routing table, description budgets, no invented product refs
python3 scripts/drift_check.py  # products.md vs the deployed Finder data (FORM_REPO env if the checkout moved)
python3 scripts/build_dist.py   # dist/: standalone claude.ai/Desktop engineer skill (+ zip) and compiled AGENTS.md
```

Rationale and the pattern analysis behind these: [`docs/architecture-port-plan.md`](./docs/architecture-port-plan.md).
