#!/usr/bin/env python3
"""Build the compiled distributions (Vercel AGENTS.md pattern).

Outputs (in dist/, git-ignored):
- plastiform-engineer-standalone/  — one uploadable claude.ai / Desktop skill: the engineer
  SKILL.md with the agent's end-to-end workflow folded in (the ROADMAP's "Desktop has no
  agents" rule), references/ kept as sibling files (claude.ai skills support folders).
- plastiform-engineer.zip          — the same folder zipped, ready to upload.
- AGENTS.md                        — everything inlined in one file, for tools that read
  that convention (Copilot/Cursor).
"""
import glob
import os
import re
import shutil

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLUGIN = os.path.join(REPO, "plugins/plastiform")
ENGINEER = os.path.join(PLUGIN, "skills/plastiform-engineer")
DIST = os.path.join(REPO, "dist")
OUT = os.path.join(DIST, "plastiform-engineer-standalone")

FINDER_NEUTRAL = (
    "Call the **find_product** MCP tool (Plastiform Finder Desktop extension), or POST the "
    "fields to `https://form.plastiform.info/api/calculate` — field reference: `references/finder.md`."
)


def body(path):
    text = open(path).read()
    return text.split("---", 2)[2].strip() if text.startswith("---") else text.strip()


def main():
    shutil.rmtree(DIST, ignore_errors=True)
    os.makedirs(os.path.join(OUT, "references"))

    skill = open(os.path.join(ENGINEER, "SKILL.md")).read()
    # No sibling skills on claude.ai/Desktop — route selection to the tool/API instead.
    skill = skill.replace(
        "**use the `plastiform-finder` skill** — don't select by hand.",
        "don't select by hand: " + FINDER_NEUTRAL,
    )
    agent = body(os.path.join(PLUGIN, "agents/plastiform-engineer.md"))
    # The agent's bash finder invocation assumes a repo checkout — replace with the neutral path.
    agent = re.sub(r"```bash\n[^`]*finder\.py[^`]*```", FINDER_NEUTRAL, agent)
    agent = agent.replace("`plastiform-finder` skill", "finder (see `references/finder.md`)")
    # The skill body already states the two hard rules — drop the agent's duplicate section.
    agent = re.sub(r"## Two rules that never bend\n(?:- \*\*.*\n)+\n?", "", agent)

    standalone = f"{skill.rstrip()}\n\n## Working a job end to end\n\n{agent}\n"
    open(os.path.join(OUT, "SKILL.md"), "w").write(standalone)

    for ref in glob.glob(os.path.join(ENGINEER, "references", "*.md")):
        shutil.copy(ref, os.path.join(OUT, "references"))
    shutil.copy(
        os.path.join(PLUGIN, "skills/plastiform-finder/SKILL.md"),
        os.path.join(OUT, "references", "finder.md"),
    )

    parts = [standalone]
    for ref in sorted(glob.glob(os.path.join(OUT, "references", "*.md"))):
        parts.append(f"\n\n---\n\n# Reference: {os.path.basename(ref)}\n\n{open(ref).read().strip()}")
    open(os.path.join(DIST, "AGENTS.md"), "w").write("".join(parts) + "\n")

    shutil.make_archive(os.path.join(DIST, "plastiform-engineer"), "zip", OUT)

    # Competitor standalone — sales/support front door on claude.ai; single self-contained file.
    comp = os.path.join(DIST, "plastiform-competitor-standalone")
    os.makedirs(comp)
    shutil.copy(os.path.join(PLUGIN, "skills/plastiform-competitor/SKILL.md"), comp)
    shutil.make_archive(os.path.join(DIST, "plastiform-competitor"), "zip", comp)

    # Self-check
    assert "find_product" in standalone and "finder.py" not in standalone
    assert standalone.count("## Two rules that never bend") == 1
    assert os.path.exists(os.path.join(OUT, "references", "products.md"))
    n_refs = len(glob.glob(os.path.join(OUT, "references", "*.md")))
    agents_kb = os.path.getsize(os.path.join(DIST, "AGENTS.md")) // 1024
    print(f"dist OK: standalone SKILL.md + {n_refs} references, AGENTS.md {agents_kb} KB, zip ready")


if __name__ == "__main__":
    main()
