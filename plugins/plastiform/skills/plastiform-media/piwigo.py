#!/usr/bin/env python3
"""Read-only query client for the Plastiform media library (Piwigo 16.3 @ media.plastiform.info).

This script NEVER writes. All structural changes are made by hand in the Piwigo admin UI.

Why it is built this way:
  - Piwigo's pwg.tags.getImages(tag_mode_and) already does AND/OR tag logic, and
    pwg.images.search already does free text. So there is no custom endpoint here.
  - pwg.images.filteredSearch.create looks perfect but is unusable: it mints a search_id
    and Piwigo ships no API method to read the results back. See selftest.
  - 76% of the library is untagged, so `search` unions tag hits with free-text hits and
    expands FR synonyms -- that is what reaches the legacy French comments.
"""

import argparse
import json
import os
import sys
import unicodedata
import urllib.parse
import urllib.request


def deaccent(s):
    """'pétrole' -> 'petrole'. French users type accents; the alias/tag tables don't
    all carry them (and the live tag `RUGOSITÉ ` even has a trailing space)."""
    return "".join(c for c in unicodedata.normalize("NFD", s.lower())
                   if not unicodedata.combining(c)).strip()

BASE = os.environ.get("PIWIGO_URL", "https://media.plastiform.info")

# ---------------------------------------------------------------------------
# Product table. Source: research_and_initial_investigation.md 1.2 (official
# Rivelec datasheets, 23 C / 50% RH). Everything derivable from a product lives
# HERE, not in Piwigo tags -- that keeps tagging cheap and the derived axes correct.
#
# constraint = max extraction constraint (%) the replica tolerates. The datasheets
# are authoritative: catalog.txt says M25=30/M60=20/M70=0, which is a PDF->text
# conversion artefact. Datasheet values below are the ones to use.
# ---------------------------------------------------------------------------
# key: (family, hardness_band, shore, constraint%, elongation%, resolution, measure, cutter, note)
PRODUCTS = {
    "f20":         ("fluid",  "flexible", "18+-2 ShA", 30,  200, "1um",  "non-contact",     False, "PMUC 04-0141 (nuclear). Reference for internal threads."),
    "f30-visual":  ("fluid",  "flexible", "30 ShA",    20,  160, "1um",  "non-contact",     False, "Contrasting black, for visual surface-finish inspection."),
    "f30-max":     ("fluid",  "flexible", "30 ShA",    40,  150, "1um",  "non-contact",     False, "Highest extraction constraint of the range."),
    "f40":         ("fluid",  "flexible", "40 ShA",    35,  100, "1um",  "non-contact",     True,  ""),
    "f50":         ("fluid",  "medium",   "50 ShA",    10,   80, "1um",  "contact-possible", True, "BEST SELLER. All-rounder."),
    "f65":         ("fluid",  "medium",   "65 ShA",     5,  100, "1um",  "contact-possible", True, ""),
    "f85":         ("fluid",  "rigid",    "85 ShA",     0,   30, "1um",  "contact",         False, "Contact measurement when it is the only option."),
    "p25":         ("pasty",  "flexible", "25 ShA",    30,  300, "1um",  "non-contact",     True,  "Highest elongation of the range."),
    "p35":         ("pasty",  "flexible", "35 ShA",    20,   80, "1um",  "non-contact",     True,  "External forms."),
    "p80-ra":      ("pasty",  "rigid",    "80 ShA",     0,   10, "1um",  "contact",         False, "Only product for contact Ra roughness. 1 nm demonstrated in optics."),
    "p51-sd":      ("pasty",  "rigid",    "51 ShD",     0,    5, "1um",  "contact",         False, "Most rigid AND fastest (~20 s working time)."),
    "m25":         ("putty",  "flexible", "25 ShA",    15,  130, "10um", "non-contact",     True,  ""),
    "m60":         ("putty",  "medium",   "60 ShA",     5,  100, "10um", "contact-possible", True, ""),
    "m70":         ("putty",  "medium",   "70 ShA",     5,   35, "10um", "contact-possible", True, "BEST SELLER of the putty family."),
    "m80-lp":      ("putty",  "rigid",    "80 ShA",     0,   20, "10um", "contact-possible", None, "Long polymerisation (~25 min set)."),
    "m80-tlp":     ("putty",  "rigid",    "80 ShA",     0,   20, "10um", "contact",         None, "Custom-formulated product. Very long polymerisation (~60 min)."),
    "m90":         ("putty",  "rigid",    "90 ShA",     0,   10, "10um", "contact",         False, ""),
    "f20-xl":      ("xl",     "flexible", "20 ShA",    30,  200, "1um",  "non-contact",     False, "Large volume. NOT the same product as F20."),
    "f30-xl":      ("xl",     "flexible", "30 ShA",    15,  150, "1um",  "non-contact",     False, "Large volume."),
    "f50-xl":      ("xl",     "medium",   "50 ShA",     5,   60, "1um",  "non-contact",     True,  "Moulds / series protection."),
    "f85-xl":      ("xl",     "rigid",    "85 ShA",     0,   30, "1um",  "contact",         False, "Large volume, rigid."),
    "f04-protect": ("protect","flexible", "04+-1 ShA", None, 260, None,  None,              None,  "Anti-moisture/corrosion protection. NOT for measurement."),
    # Support products -- no impression specs.
    "promixr":     ("support", None, None, None, None, None, None, None, "Dispensing machine for F04 Protect bottles."),
    "re-form":     ("support", None, None, None, None, None, None, None, "Reusable thermoformable resin."),
    "plastin":     ("support", None, None, None, None, None, None, None, "Technical modelling clay. Barrier / plug / shim / cleaning."),
    "dn1":         ("support", None, None, None, None, None, None, None, "Kristal degreaser. Mandatory before every impression."),
    "lr-2c":       ("support", None, None, None, None, None, None, None, "Two-component polyurethane resin kit."),
    "lr-3c":       ("support", None, None, None, None, None, None, None, "Three-component polyurethane resin kit."),
}

# Product colors -- exact tints pixel-sampled from each datasheet's product color dot
# (TEC_FTE_RIV_* page 1, sampled 2026-07-22; hex in the comment). Color alone is a SHORTLIST,
# not an ID -- disambiguate by packaging then hardness/flex test. The `color:` derived facet
# matches by substring, so color:green / color:blue / color:grey hit the whole family.
COLORS = {
    "f20": "pistachio-green",      # 83c07b
    "f30-visual": "black",         # 0c0c09 -- cures GLOSSY black (optical contrast)
    "f30-max": "mauve-purple",     # 9c8cae -- same tint as F30 XL
    "f40": "white",                # white dot (outline only)
    "f50": "sky-blue",             # 8abfe3
    "f65": "burnt-orange",         # cb542f
    "f85": "mid-grey",             # 939191
    "p25": "teal",                 # 00aaac
    "p35": "salmon",               # f1a48a
    "p80-ra": "azure-blue",        # 179cd8
    "p51-sd": "coral-pink",        # ef9490
    "m25": "sage-green",           # 71a078
    "m60": "turquoise",            # 2db6b5 -- teal family, next to P25's teal
    "m70": "light-grey",           # a19f9e
    "m80-lp": "navy-blue",         # 2a3578
    "m80-tlp": "navy-blue",        # 293477
    "m90": "slate-grey",           # 45575a
    "f20-xl": "rose-pink",         # efa0b7
    "f30-xl": "mauve-purple",      # 9c8bad -- same tint as F30 Max
    "f50-xl": "black",             # 010303
    "f85-xl": "pale-grey",         # dddddd
    "f04-protect": "yellow-translucent",  # fce800 code color; the cured film is translucent
}

FACETS = {
    "product": sorted(PRODUCTS),
    "app": ["dimensional-control", "roughness-control", "visual-finish",
            "protection-masking", "holding-clamping", "gauge-protection"],
    "feature": ["internal-thread", "external-thread", "bore", "blind-bore", "through-bore",
                "internal-groove", "external-groove", "undercut", "dovetail", "radius",
                "flat-surface", "vertical-surface", "tube", "cavity", "shaft", "nut", "cylinder"],
    "instrument": ["profile-projector", "vision-system", "microscope", "roughness-tester",
                   "optical-roughness-tester", "caliper", "cmm", "contact", "non-contact"],
    "sector": ["oil-gas", "aerospace", "automotive", "nuclear", "watchmaking"],
    "accessory": ["gun-dm50", "gun-dp50", "gun-db50", "gun-dm400", "gun-dp400", "gun-db400",
                  "nozzle-standard", "nozzle-eco", "nozzle-needle", "nozzle-long", "nozzle-ll",
                  "needle-tip", "cutter-double-blade", "cutting-guide", "demolding-ring",
                  "fill-in", "spoon", "case", "kit"],
    "shot": ["packshot", "cutout", "in-situ", "macro", "replica", "screenshot",
             "diagram", "logo", "mockup", "video-still",
             # non-product content: company life, events, partners, proof
             "portrait", "team", "booth", "document", "collateral"],
    "rights": ["own", "credit", "restricted"],
    "ref": ["<open: exact SKU, e.g. ca-f20-8, ml-040-ex, ac-012, kd-m70>"],
    "event": ["<open: official event name + year, e.g. global-industrie-2025>"],
    "partner": ["<open: distributor name, e.g. acme-tools>"],
}

# The ONLY facets where a new value may be created. Everything else is closed: if a word
# isn't listed, it doesn't get tagged. Event and distributor names cannot be enumerated in
# advance, so they get an explicit exception rather than quietly rotting the vocabulary.
OPEN_FACETS = {"ref", "event", "partner"}

# Attribution deliberately does NOT live in a tag. Piwigo has a native `author` field on every
# image (empty on all 1189 today) -- that is the credit line. `rights:` only says what you may
# do with the photo. Native `date_creation` (87% populated) already gives events a year axis,
# so there is no `year:` facet either.

# Derived facets are computed from PRODUCTS, never tagged. Each expands to an OR over products.
DERIVED = {
    "family":     lambda p, v: PRODUCTS[p][0] == v,
    "hardness":   lambda p, v: PRODUCTS[p][1] == v,
    "resolution": lambda p, v: PRODUCTS[p][5] == v,
    "measure":    lambda p, v: PRODUCTS[p][6] == v,
    "cutter":     lambda p, v: PRODUCTS[p][7] is True and v in ("yes", "true"),
    "color":      lambda p, v: v in (COLORS.get(p) or ""),  # substring: color:blue -> sky/azure/navy
}

# FR <-> EN bridge. Does double duty: French queries -> English tags, AND English
# queries -> the legacy French comments (83% of photos have no description; the ones
# that do are French, e.g. "Controle de gorge interne avec M25").
SYNONYMS = {
    "roughness": ["rugosite", "rugosité", "ra"],
    "internal groove": ["gorge interne", "gorges internes"],
    "external groove": ["gorge externe", "gorges exterieures", "gorges extérieures"],
    "groove": ["gorge", "rainure"],
    "internal thread": ["filetage interne", "taraudage"],
    "external thread": ["filetage externe"],
    "thread": ["filetage", "spires", "pas de vis"],
    "bore": ["alesage", "alésage"],
    "through bore": ["alesage debouchant", "trou debouchant", "alésage débouchant"],
    "blind bore": ["trou borgne", "alesage non debouchant"],
    "undercut": ["contre-depouille", "contre-dépouille"],
    "surface finish": ["etat de surface", "état de surface"],
    "dimensional control": ["controle dimensionnel", "contrôle dimensionnel"],
    "impression": ["empreinte"],
    "replica": ["empreinte", "replique", "réplique"],
    "cutout": ["detoure", "détouré", "detoure"],
    "gun": ["pistolet"],
    "nozzle": ["injecteur", "embout"],
    "cutter": ["cutter double lame", "coupe"],
    "ring": ["bague", "bague de demoulage"],
    "tube": ["tube"],
    "oil gas": ["petrole", "pétrole"],
    "shaft": ["arbre"],
    "nut": ["ecrou", "écrou"],
    "case": ["mallette"],
    "kit": ["kit"],
    "curing": ["polymerisation", "polymérisation"],
    "extraction": ["extraction", "demoulage", "démoulage"],
    "degreaser": ["degraissant", "dégraissant"],
}

# Free words -> canonical tag, for the fuzzy `search` path only.
ALIASES = {}
for _p in PRODUCTS:
    ALIASES[_p] = "product:" + _p
    ALIASES[_p.replace("-", "")] = "product:" + _p
    ALIASES[_p.replace("-", " ")] = "product:" + _p
ALIASES.update({
    "roughness": "app:roughness-control", "rugosite": "app:roughness-control",
    "rugosité": "app:roughness-control", "ra": "app:roughness-control",
    "dimensional": "app:dimensional-control",
    "visual": "app:visual-finish", "protection": "app:protection-masking",
    "masking": "app:protection-masking", "holding": "app:holding-clamping",
    "clamping": "app:holding-clamping", "gauge": "app:gauge-protection",
    "oil": "sector:oil-gas", "gas": "sector:oil-gas", "petrole": "sector:oil-gas",
    "aerospace": "sector:aerospace", "aeronautique": "sector:aerospace",
    "automotive": "sector:automotive", "nuclear": "sector:nuclear",
    "watchmaking": "sector:watchmaking",
    "packshot": "shot:packshot", "cutout": "shot:cutout", "detoure": "shot:cutout",
    "macro": "shot:macro", "logo": "shot:logo", "diagram": "shot:diagram",
    # French terms a user will actually type. Accents are handled by ALIAS_DEACCENTED.
    "filetage": "feature:internal-thread", "alesage": "feature:bore",
    "gorge": "feature:internal-groove", "tube": "feature:tube",
    "empreinte": "shot:replica",
    "pistolet": "accessory:gun-dm50", "injecteur": "accessory:nozzle-standard",
    "mallette": "accessory:case", "rugosimetre": "instrument:roughness-tester",
    "projecteur de profil": "instrument:profile-projector",
    "microscope": "instrument:microscope",
    # company life / events / partners / proof
    "salon": "shot:booth", "stand": "shot:booth", "booth": "shot:booth",
    "tradeshow": "shot:booth", "expo": "shot:booth",
    "portrait": "shot:portrait", "equipe": "shot:team", "team": "shot:team",
    "certificat": "shot:document", "certificate": "shot:document",
    "rapport": "shot:document", "report": "shot:document",
    "document": "shot:document", "pmuc": "shot:document", "cetim": "shot:document",
    "brochure": "shot:collateral", "catalogue": "shot:collateral",
    "plaquette": "shot:collateral", "collateral": "shot:collateral",
})

# Accent-insensitive view of ALIASES, so `pétrole` resolves like `petrole`.
ALIAS_DEACCENTED = {deaccent(k): v for k, v in ALIASES.items()}


class Piwigo:
    """Minimal read-only Piwigo client. Stdlib only."""

    def __init__(self, base=BASE):
        self.base = base.rstrip("/") + "/ws.php"
        # Piwigo 16.1+ requires X-PIWIGO-API (it was `Authorization` in 16.0.0 only).
        # Anonymous works for all public albums; a key is only needed for Internal/.
        self.key = os.environ.get("PIWIGO_API_KEY")

    def call(self, method, **params):
        pairs = [("format", "json"), ("method", method)]
        for k, v in params.items():
            if v is None:
                continue
            if isinstance(v, (list, tuple)):
                pairs += [(k + "[]", str(x)) for x in v]
            else:
                pairs.append((k, str(v)))
        url = self.base + "?" + urllib.parse.urlencode(pairs)
        req = urllib.request.Request(url)
        if self.key:
            req.add_header("X-PIWIGO-API", self.key)
        with urllib.request.urlopen(req, timeout=45) as r:
            data = json.loads(r.read().decode())
        if data.get("stat") != "ok":
            raise RuntimeError("%s: %s" % (method, data.get("message", data)))
        return data["result"]

    def tag_index(self):
        """Keyed on the de-accented name, so `RUGOSITÉ ` is reachable as `rugosite`."""
        return {deaccent(t["name"]): t for t in self.call("pwg.tags.getList")["tags"]}

    def by_tags(self, tag_ids, mode_and=True, per_page=100):
        if not tag_ids:
            return []
        r = self.call("pwg.tags.getImages", **{
            "tag_id": list(tag_ids),
            "tag_mode_and": "true" if mode_and else "false",
            "per_page": per_page,
        })
        return r["images"]

    def text(self, query, per_page=100):
        try:
            return self.call("pwg.images.search", query=query, per_page=per_page)["images"]
        except RuntimeError:
            return []


def expand_derived(token):
    """`family:fluid` -> [product:f20, product:f30-visual, ...]. Returns None if not derived."""
    if ":" not in token:
        return None
    facet, value = token.split(":", 1)
    if facet not in DERIVED:
        return None
    test = DERIVED[facet]
    return ["product:" + p for p in PRODUCTS if _safe(test, p, value)]


def _safe(test, p, v):
    try:
        return test(p, v)
    except Exception:
        return False


# Legacy bare tags that predate the facet convention, e.g. `M70` (12 photos), `P80Ra` (42),
# `RUGOSITÉ ` (41, trailing space). Nothing is being bulk-retagged, so a canonical token must
# fall back to its legacy spelling or the 279 already-tagged photos stay unreachable.
# Delete this shim once PIWIGO_RESTRUCTURE.md's tag renames are done.
LEGACY = {
    "app:roughness-control": ["rugosité", "rugosite"],
    "sector:oil-gas": ["petrole"],
    "shot:cutout": ["detoure"],
    "accessory:cutter-double-blade": ["cutter double lames", "cutter"],
    "accessory:cutting-guide": ["guide cutter"],
    "accessory:demolding-ring": ["ac-011"],
    "product:plastin": ["plastin"],
    "product:re-form": ["re-form"],
    "product:dn1": ["dn1"],
}


def _candidates(token):
    """Canonical token -> spellings to try against live Piwigo tags, best first."""
    out = [token]
    out += LEGACY.get(token, [])
    if ":" in token:
        value = token.split(":", 1)[1]
        out += [value, value.replace("-", ""), value.replace("-", " ")]
    return [deaccent(c) for c in out]


def resolve_tags(pw, tokens):
    """Map canonical tag tokens onto live Piwigo tag ids. Returns (ids, missing)."""
    index = pw.tag_index()
    ids, missing = [], []
    for t in tokens:
        for cand in _candidates(t.strip().lower()):
            hit = index.get(cand)
            if hit:
                ids.append(hit["id"])
                break
        else:
            missing.append(t.strip().lower())
    return ids, missing


def synonyms_for(query):
    """Return the other-language terms to also search for. Matching is accent-insensitive,
    but the returned terms keep their accents -- Piwigo's own text search wants them."""
    q = deaccent(query)
    out = []
    for en, frs in SYNONYMS.items():
        if deaccent(en) in q:
            out += [f for f in frs if f not in out]
        for fr in frs:
            if deaccent(fr) in q and en not in out:
                out.append(en)
    return out


def fmt(images, source):
    rows = []
    for im in images:
        row = {
            "id": im["id"],
            "name": (im.get("name") or "").strip(),
            "comment": (im.get("comment") or "").strip() or None,
            "file": im.get("file"),
            "url": im.get("page_url") or im.get("element_url"),
            "via": source,
        }
        # Surfaced so a caller reusing a photo knows whether a credit line is owed.
        if im.get("author"):
            row["author"] = im["author"]
        rows.append(row)
    return rows


def cmd_vocab(args):
    print("# Plastiform media library -- controlled vocabulary\n")
    print("Tag format: `facet:value`. English canonical. Tag ONLY what the photo shows.\n")
    for facet, values in FACETS.items():
        print("%s:%s" % (facet, "   [OPEN -- new values allowed]" if facet in OPEN_FACETS else ""))
        print("    " + " ".join(values) + "\n")
    print("# Closed facets: if a word is not listed, it is not tagged. Only %s accept new values."
          % ", ".join(sorted(OPEN_FACETS)))
    print("\n# Native Piwigo fields -- use these, do NOT duplicate them as tags:")
    print("    author          who to credit (the credit line). Empty on all 1189 photos today.")
    print("    date_creation   when it was shot; gives events their year axis. 87% populated.")
    print("\n# Derived facets -- COMPUTED, never tagged. Usable in queries; expand to an OR over products.")
    for d in DERIVED:
        print("    %s:" % d)
    print("\n# Product table (datasheet values; constraint = max extraction constraint %)\n")
    hdr = ("product", "family", "hardness", "shore", "constr", "elong", "res", "measure", "cutterDL")
    print("%-12s %-19s %-8s %-9s %-10s %6s %6s %5s %-17s %s" % (hdr[:1] + ("color",) + hdr[1:]))
    for p, v in PRODUCTS.items():
        if v[0] == "support":
            continue
        print("%-12s %-19s %-8s %-9s %-10s %6s %6s %5s %-17s %s" % (
            p, COLORS.get(p, "-"), v[0], v[1] or "-", v[2] or "-",
            "-" if v[3] is None else "%d%%" % v[3],
            "-" if v[4] is None else "%d%%" % v[4],
            v[5] or "-", v[6] or "-",
            {True: "yes", False: "no", None: "maybe"}[v[7]]))
    print("\n# Support products: " + ", ".join(p for p, v in PRODUCTS.items() if v[0] == "support"))
    print("\n# Product selection: use the plastiform-finder skill / find_product MCP tool -- not this table.")
    return 0


def cmd_tags(args):
    pw = Piwigo()
    tokens = []
    for t in args.tags:
        exp = expand_derived(t)
        if exp is not None:
            if not exp:
                print("no product matches derived facet %r" % t, file=sys.stderr)
                return 1
            if len(args.tags) > 1:
                print("note: %s expands to %d products (OR)" % (t, len(exp)), file=sys.stderr)
            tokens += exp
        else:
            tokens.append(t)
    ids, missing = resolve_tags(pw, tokens)
    if missing:
        print("not present in Piwigo yet: %s" % ", ".join(missing), file=sys.stderr)
    if not ids:
        print(json.dumps({"count": 0, "images": [], "missing_tags": missing}, indent=1))
        return 0
    imgs = pw.by_tags(ids, mode_and=(args.mode == "and"), per_page=args.limit)
    out = {"count": len(imgs), "mode": args.mode, "missing_tags": missing,
           "images": fmt(imgs, "tag")}
    print(json.dumps(out, indent=1, ensure_ascii=False))
    return 0


def cmd_search(args):
    """Union the tag path and the text path, then rank by how many signals hit.

    Ranking matters: a query like "internal groove M25" may only resolve `product:m25`
    as a tag (there is no `feature:internal-groove` tag yet), which alone matches every
    M25 photo. The groove photos are the ones that hit BOTH that tag and the text, so
    counting signals floats them above the generic packshots.
    """
    pw = Piwigo()
    q = args.query
    pool = {}  # id -> {"image":…, "sources":set()}

    def add(im, source):
        e = pool.setdefault(im["id"], {"image": im, "sources": set()})
        e["sources"].add(source)

    # 1. tag path -- precise, but only reaches the ~24% of the library that is tagged.
    words = [deaccent(w.strip(",.;:()")) for w in q.split()]
    hits = []
    for n in (2, 1):  # try two-word aliases before single words
        for i in range(len(words) - n + 1):
            frag = " ".join(words[i:i + n])
            if frag in ALIAS_DEACCENTED and ALIAS_DEACCENTED[frag] not in hits:
                hits.append(ALIAS_DEACCENTED[frag])
    if hits:
        ids, _ = resolve_tags(pw, hits)
        if ids:
            for mode in (True, False):  # AND first, fall back to OR
                found = pw.by_tags(ids, mode_and=mode, per_page=max(args.limit, 100))
                for im in found:
                    add(im, "tag")
                if found:
                    break

    # 2. text path -- reaches the untagged legacy photos through name/comment/file.
    #    Synonyms are what make an English query hit a French comment.
    syns = synonyms_for(q)
    for term in [q] + syns:
        for im in pw.text(term, per_page=max(args.limit, 100)):
            add(im, "text:" + term)

    ranked = sorted(pool.values(), key=lambda e: -len(e["sources"]))[:args.limit]
    out = {
        "query": q,
        "matched_tags": hits,
        "synonyms_tried": syns,
        "count": len(ranked),
        "images": [dict(r, via="+".join(sorted(e["sources"]))[:60])
                   for e in ranked for r in [fmt([e["image"]], "")[0]]],
    }
    print(json.dumps(out, indent=1, ensure_ascii=False))
    return 0


def cmd_albums(args):
    pw = Piwigo()
    cats = pw.call("pwg.categories.getList", recursive="true", fullname="true")["categories"]
    rows = [{"id": c["id"], "name": c["name"], "status": c.get("status"),
             "images": c.get("nb_images"), "total": c.get("total_nb_images")}
            for c in sorted(cats, key=lambda x: x.get("global_rank", ""))]
    print(json.dumps(rows, indent=1, ensure_ascii=False))
    return 0


def cmd_album(args):
    pw = Piwigo()
    r = pw.call("pwg.categories.getImages", cat_id=args.id, per_page=args.limit)
    print(json.dumps({"count": r["paging"]["total_count"],
                      "images": fmt(r["images"], "album")}, indent=1, ensure_ascii=False))
    return 0


def cmd_selftest(args):
    """Live invariants. Fails loudly if Piwigo behaviour drifts under us."""
    pw = Piwigo()
    ok = True

    def check(label, cond, why="", info=""):
        """why is printed only on failure; info is data worth seeing either way."""
        nonlocal ok
        ok = ok and cond
        tail = info or ("" if cond else why)
        print("%s %s%s" % ("PASS" if cond else "FAIL", label, (" -- " + tail) if tail else ""))

    v = pw.call("pwg.getVersion")
    check("Piwigo reachable", str(v).startswith("16."), why="expected 16.x", info="v%s" % v)

    idx = pw.tag_index()
    a = idx.get("p80ra")
    b = idx.get("rugosité") or idx.get("rugosite")
    if a and b:
        n_and = len(pw.by_tags([a["id"], b["id"]], mode_and=True, per_page=500))
        n_or = len(pw.by_tags([a["id"], b["id"]], mode_and=False, per_page=500))
        check("tag AND is narrower than OR", n_and < n_or, info="AND=%d OR=%d" % (n_and, n_or))
        check("tag AND/OR logic is real", n_and > 0 and n_or > 0)
    else:
        check("legacy tags P80Ra/RUGOSITE present", False,
              why="vocabulary may already be migrated; update this check")

    check("free-text search reaches French comments", len(pw.text("gorge", per_page=5)) > 0,
          why="'gorge' must match the untagged legacy photos -- the whole design leans on this")

    # The dead end this design deliberately avoids. If this ever PASSES, Piwigo gained a
    # retrieval method and `search` could be simplified to one server-side call.
    try:
        sid = pw.call("pwg.images.filteredSearch.create", tags=[a["id"]] if a else [1],
                      tags_mode="OR")["search_id"]
        n = len(pw.text("search:" + sid, per_page=5))
        check("filteredSearch still has no retrieval path", n == 0,
              why="it returned %d results -- Piwigo gained a retrieval method, "
                  "`search` could now collapse to one server-side call" % n)
    except Exception as e:
        check("filteredSearch still has no retrieval path", True,
              info="errored, as expected: %s" % str(e)[:50])

    print("\n%s" % ("all invariants hold" if ok else "INVARIANTS BROKEN"))
    return 0 if ok else 1


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    sub = ap.add_subparsers(dest="cmd", required=True)

    sub.add_parser("vocab", help="print the controlled vocabulary + product table").set_defaults(fn=cmd_vocab)

    p = sub.add_parser("search", help="natural-language search (tag hits + text hits + FR synonyms)")
    p.add_argument("query")
    p.add_argument("--limit", type=int, default=25)
    p.set_defaults(fn=cmd_search)

    p = sub.add_parser("tags", help="exact faceted search, e.g. product:m70 app:roughness-control")
    p.add_argument("tags", nargs="+")
    p.add_argument("--mode", choices=["and", "or"], default="and")
    p.add_argument("--limit", type=int, default=100)
    p.set_defaults(fn=cmd_tags)

    sub.add_parser("albums", help="list the album tree").set_defaults(fn=cmd_albums)

    p = sub.add_parser("album", help="list images in an album")
    p.add_argument("id")
    p.add_argument("--limit", type=int, default=25)
    p.set_defaults(fn=cmd_album)

    sub.add_parser("selftest", help="assert live Piwigo invariants").set_defaults(fn=cmd_selftest)

    args = ap.parse_args()
    try:
        return args.fn(args)
    except urllib.error.URLError as e:
        print("cannot reach %s: %s" % (BASE, e), file=sys.stderr)
        return 2
    except RuntimeError as e:
        print("piwigo error: %s" % e, file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
