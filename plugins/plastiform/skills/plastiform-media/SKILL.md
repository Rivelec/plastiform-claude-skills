---
name: plastiform-media
description: Use when searching, browsing, or picking images from the Plastiform media library at media.plastiform.info (Piwigo) - product photos, packshots, application or in-situ shots, impression comparison sets. Also use when adding images to the library or asking how it is organised.
---

# Plastiform media library

Read-only client for the Plastiform Piwigo at `media.plastiform.info`. **This skill never writes.**
All structural changes are made by hand in the Piwigo admin UI — see `PIWIGO_RESTRUCTURE.md`.

## Start here

```bash
cd <this skill's directory>
python3 piwigo.py vocab          # facets + product table. Read this before composing a query.
```

## Commands

```bash
python3 piwigo.py search "roughness on an oil & gas tube with M70"   # fuzzy: tags + text + FR synonyms
python3 piwigo.py tags product:m70 app:roughness-control --mode and  # exact faceted search
python3 piwigo.py tags family:putty --mode or                        # derived facet -> OR over products
python3 piwigo.py albums                                             # album tree
python3 piwigo.py album 13 --limit 25                                # images in an album
python3 piwigo.py selftest                                           # assert live Piwigo invariants
```

Use **`search`** when the request is in prose. Use **`tags`** when you already know the facets —
it is exact, and it reports which tags don't exist rather than guessing.

## Two things to know before you trust a result

**1. Only ~24% of the library is tagged.** 873 of 1152 photos have no tags and 83% have no
description. So `tags` alone will miss most of the library. `search` compensates by unioning tag
hits with free-text hits over name/comment/filename.

**2. The legacy content is French.** The photos that *do* have a description have a French one
(`Contrôle de gorge interne avec M25`). `search` expands an English query through a FR synonym map,
which is why `search "internal groove M25"` finds them. Queries work in either language and are
accent-insensitive (`pétrole` resolves like `petrole`). If a `search` comes back thin, try the
French term directly.

## Recognize a product from a photo

Given a user's photo of a product or impression, first rule out support products, then
identify in three steps:

0. **Support products first.** A white or translucent shapeless mass touching the part is
   usually not the impression: **Re-Form** (thermoplastic — translucent hot and soft, opaque
   white cooled) bridges dams around a pour zone, forms holding beds and fixation bases;
   **Plastin** (non-greasy modeling clay) makes flow barriers, plugs and wedges. Both take
   real `product:` tags, *alongside* the impression product in the same photo.
1. **Color → shortlist.** The `vocab` product table has a `color` column — **exact tints
   pixel-sampled from the datasheets** (pistachio-green, azure-blue, coral-pink…); the full
   table with hex values and look-alike neighbours is in the engineer skill's
   `references/recognition.md`. Color is a shortlist, never an ID: `color:` matches by
   substring (`color:blue` → sky/azure/navy, `color:grey` → all greys), but exact values
   like `teal` vs `turquoise` are distinct — check the neighbours column. And datasheet
   tint ≠ cured-photo tint: cured **M25 photographs lighter than P25** (field-confirmed) —
   a look-alike pair is settled by step 3, never by tint alone.
2. **Packaging / context**: 50 ml cartridge = F or P · pot = M · 400 ml cartridge/bottle/drum = XL.
   Visible application narrows further (glossy black disc ⇒ F30 Visual; putty on a thread ⇒ M).
3. **Confirm against the library** — pull that product's photos and compare side by side:
   ```bash
   python3 piwigo.py tags product:m70 --mode and
   python3 piwigo.py tags color:blue --mode or      # derived facet: all products of one color
   ```

## Find images matching a geometry

The `feature:` facet is the geometry vocabulary — use it when the user shows or describes a shape:

```bash
python3 piwigo.py tags feature:internal-thread --mode and
python3 piwigo.py tags feature:bore app:dimensional-control --mode and
```

Values: `internal-thread external-thread bore blind-bore through-bore internal-groove
external-groove undercut dovetail radius flat-surface vertical-surface tube cavity shaft nut
cylinder`. Thin result? Fall back to `search` with the French term (`"gorge interne"`,
`"filetage"`) — most legacy descriptions are French.

**Selecting** a product for that geometry is the **`plastiform-finder`**'s job (or the
`find_product` MCP tool) — this skill finds *images*, the finder picks *products*.

## Tagging vocabulary

`references/taxonomy.md` is authoritative. Three rules that matter most:

- **Tag everything the photo shows.** One tag per visible attested facet — impression
  geometry (`feature:`), part context (`sector:`), `instrument:`, `accessory:`, and *every*
  product in frame (a Re-Form dam beside an F50 pour = two `product:` tags). Search
  relevance comes from tag density; a photo carrying only `product:` is barely findable.
- **Tag only what the photo shows and you cannot derive.** `family:`, `hardness:`, `resolution:`,
  `measure:`, `cutter:` are *computed* from `product:` — never tag them.
- **Never invent a tag.** The vocabulary is restricted to terms attested in the catalog and the
  technical training. `weld`, `crack`, `gear`, `keyway` are deliberately absent; no source supports
  them.

For adding images, point the human at `MEDIA_LIBRARY_CHEATSHEET.md` (French — the doc Plastiform
staff use, with the French→tag lookup table; it lives in the brain-plastiform knowledge repo).

## Auth

Anonymous by default — every public album is readable with no credentials. For the private
`Internal/` albums, set an API key (Piwigo 16 → profile → API Keys):

```bash
export PIWIGO_API_KEY='pkid-XXXXXXXX-XXXXXXXXXXXX:<secret>'
```

Sent as the `X-PIWIGO-API` header. Piwigo 16.1+ requires that header; the `Authorization` header
worked only in 16.0.0 and now fails silently.

## Design notes (why there is no custom API here)

- `pwg.tags.getImages` + `tag_mode_and` already does AND/OR tag logic. `pwg.images.search` already
  does free text. Native is good enough — no plugin, no endpoint.
- **`pwg.images.filteredSearch.create` is a trap.** It looks ideal (native AND/OR *plus* field-scoped
  text) but mints a `search_id` with no API method to read results back. It always returns 0.
  `selftest` asserts this is still true — if that check ever fails, Piwigo gained a retrieval path
  and `search` could collapse into one server-side call.
