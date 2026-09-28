---
name: gemini-writer
description: Writes already-decided content (mail, blog article, product page, LinkedIn post) with Gemini via OpenRouter, the way a Rivelec employee would. Decides neither content nor technique. Use for any Plastiform text sent to customers or published, even if Gemini is not mentioned.
---

# Gemini writer

This skill writes; it does not decide. What the text says (its points, their order, the sections, any technique such as SEO or a call to action) is decided before it runs, by the request, by you from verified sources, or by another skill. Gemini 3.1 Pro then writes that content the way a Rivelec employee would: a salesperson or technician of a French industrial SME writing to people in industry, plainly and precisely, never like a marketer. The way of writing comes from what sales and marketing writers have published about writing (Ogilvy, Zinsser, Handley, Graham, Fried, Braun, Nielsen, Canivet, Hardy, Niederhoffer and others; see `references/sources.md`). Gemini was chosen after comparing its drafts with Opus on real customer requests (September 2026).

## Steps

1. **Pick the genre**: `mail`, `blog`, `product-page` or `linkedin`. For anything else, take the closest one, put the difference in `notes`, and say which you used.
2. **Settle the content before writing.** List the points to say, in order (`content` for a mail or a post), or the sections with their points (`sections` for an article or a product page). Take them from the request; if the request leaves the substance open (which product, which argument, which answer to a technical question), ask the requester or take it from a verified source, don't leave it to Gemini. Gemini writes every point and adds none, so put the substance in the points: what to say, and the how and the why you want said. « Dégraisser au DN1 » gives a dry checklist; « dégraisser au DN1 : pulvériser, laisser évaporer sans essuyer, sinon l'empreinte reste collante » gives a real paragraph.
3. **Gather the facts the points rely on** (`facts`): exact names, references, figures, units, links. Gemini states nothing else, and the script flags any number that is not in the brief.
   - Plastiform: the `plastiform-engineer` skill of this plugin (range, accessories, application, troubleshooting) and the `plastiform-brand` rules. On Tanguy's machine, also `~/lab/marketing.plastiform.info/.specify/memory/brand-knowledge/` (read `do-not-invent.md` first), the technical training `~/lab/wooPlastiform/formation-technique-plastiform.md`, the catalogue `~/lab/wooPlastiform/catalog.txt` and `catalog.products` in `~/lab/n8nPlastiform/knowledge/twenty-crm-schema.json`. Demo booking links from www.plastiform.info: https://calendly.com/g-adragna/30min for French, https://calendly.com/vmajeau/demonstration-plastiform for other languages.
4. **Write the brief** as JSON in the scratchpad (format below).
5. **Run** `node <this skill's directory>/scripts/write.mjs <brief.json> --out <dir>` (the directory shown as the skill's base directory when it loads; needs node 18 or later). It prints the Markdown, writes `content.json` and `content.md`, lists the checks still failing under « À vérifier », and the cost. When checks fail, it asks Gemini once to fix only those points.
6. **Review against the brief**: every point is written, nothing is added (no extra advice, argument, question, anecdote or call to action), each fact keeps its strength (« peut » did not become « souvent »). If something is off, fix the brief and rerun rather than rewriting yourself. A small fix by hand is fine if you say what you changed.
7. **Present** the text as Markdown, then one line with the remaining checks and the cost.

## Brief

```json
{
  "type": "mail",
  "language": "fr",
  "author": "Tanguy Magnaudet, commercial chez Rivelec (Plastiform)",
  "reader": "who reads it and what they already know",
  "context": "for a reply: the message being answered, verbatim",
  "content": ["first point to say", "second point"],
  "facts": ["exact names, figures and units the points rely on"],
  "format": { "maxWords": 125 },
  "notes": "anything else Gemini must know"
}
```

- `mail` and `linkedin` take `content`; `blog` and `product-page` take `sections`: `[{ "heading": "what the section is about", "points": ["what it says"] }]`, one entry per section, in order.
- `format` is optional: `maxWords` for a mail (default 125), `minWords`/`maxWords` for an article or a page, `maxChars` for a post (default 1,300). There is no default minimum: the length follows the content, and Gemini is told not to pad.
- `hashtags` (post only): the hashtags wanted, if any. Gemini adds none of its own.

## Form of each genre (in `scripts/types.mjs`)

| Genre | Output | Form |
|---|---|---|
| `mail` | subject, greeting, paragraphs, closing | subject 3 to 7 words, short paragraphs (related points together), 125 words max, no signature (the mail client adds it), usual polite formulas welcome |
| `blog` | title, intro, sections | title 4 to 10 words, intro (chapô) 50 words max, one section per section of the brief with a heading that says what it contains, lists only for steps or parallel items, no summary conclusion |
| `product-page` | title, summary, sections, specs | product name as in the facts, one or two sentences of summary, factual present tense, specs copied from the facts |
| `linkedin` | text, hashtags | first person, short blocks for a phone, 1,300 characters max, no hook formula, hashtags only from the brief |

Every genre is also checked for long dashes, emoji, bold, exclamation marks, sentences over 30 words, AI vocabulary, and figures missing from the brief.

## The rule

`references/rules.md` is sent to Gemini word for word with every request: its role (write the given content, add nothing, invent nothing), who writes (a Rivelec employee), how he writes (the rules shared by the writers in `references/sources.md`), what gives a machine away, and the register per language. To change how everything is written, edit that file; to change one genre's form, edit `scripts/types.mjs`. Don't patch the rule through briefs.

## Model and key

Default model `google/gemini-3.1-pro-preview`, reasoning effort high, structured JSON output. Override with `--model <id>` or `GEMINI_WRITER_MODEL`. It is a preview model: if OpenRouter answers 404, list the current Gemini Pro models (`curl -s https://openrouter.ai/api/v1/models`) and use the newest. The OpenRouter key is read from `OPENROUTER_API_KEY`, else `~/.config/openrouter/key` (one line, readable by you only). A text costs a few cents.
