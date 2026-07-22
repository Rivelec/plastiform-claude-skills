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
