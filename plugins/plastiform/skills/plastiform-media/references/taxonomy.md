# Plastiform media library — controlled vocabulary

Canonical language: **English**. Tag format: `facet:value`, lowercase, dash-separated.

Run `python3 piwigo.py vocab` for the machine-readable version of this file (it is generated
from the same tables the script queries with, so it cannot drift).

French→tag lookup for people tagging photos lives in `MEDIA_LIBRARY_CHEATSHEET.md` (project root).

## The one rule

> **Tag only what the photo *shows* and you cannot derive.**

Anything computable from the product — family, hardness band, extraction constraint,
elongation, resolution, contact-compatibility, cutter compatibility — is **never tagged**.
The script derives it from `product:` via the table below. This keeps tagging cheap enough
that a human will actually do it, and keeps the derived axes correct for free.

The corollary: **tag *all* of what it shows.** One tag per visible attested facet —
impression geometry (`feature:`), part context (`sector:`), `instrument:`, `accessory:`,
`shot:` — and every product in frame: a Re-Form dam or Plastin barrier beside an F50 pour
is a second `product:` tag. Search relevance comes from tag density; a photo carrying only
`product:` is barely findable.

## The facets

**Closed** — if a word isn't listed, it isn't tagged:

| Facet | Values |
|---|---|
| `product:` | `f20` `f30-visual` `f30-max` `f40` `f50` `f65` `f85` `p25` `p35` `p80-ra` `p51-sd` `m25` `m60` `m70` `m80-lp` `m80-tlp` `m90` `f20-xl` `f30-xl` `f50-xl` `f85-xl` `f04-protect` `promixr` `re-form` `plastin` `dn1` `lr-2c` `lr-3c` |
| `app:` | `dimensional-control` `roughness-control` `visual-finish` `protection-masking` `holding-clamping` `gauge-protection` |
| `feature:` | `internal-thread` `external-thread` `bore` `blind-bore` `through-bore` `internal-groove` `external-groove` `undercut` `dovetail` `radius` `flat-surface` `vertical-surface` `tube` `cavity` `shaft` `nut` `cylinder` |
| `instrument:` | `profile-projector` `vision-system` `microscope` `roughness-tester` `optical-roughness-tester` `caliper` `cmm` `contact` `non-contact` |
| `sector:` | `oil-gas` `aerospace` `automotive` `nuclear` `watchmaking` |
| `accessory:` | `gun-dm50` `gun-dp50` `gun-db50` `gun-dm400` `gun-dp400` `gun-db400` `nozzle-standard` `nozzle-eco` `nozzle-needle` `nozzle-long` `nozzle-ll` `needle-tip` `cutter-double-blade` `cutting-guide` `demolding-ring` `fill-in` `spoon` `case` `kit` |
| `shot:` | `packshot` `cutout` `in-situ` `macro` `replica` `screenshot` `diagram` `logo` `mockup` `video-still` `portrait` `team` `booth` `document` `collateral` |
| `rights:` | `own` `credit` `restricted` |

Two traps in the closed lists:

- `accessory:fill-in` is the **filin** — the thin metal bubble-chasing wire — **not** a filler
  or damming paste, despite the name. Dams and holding beds are *products*:
  `product:re-form` (thermoplastic — translucent hot, opaque white cooled) or
  `product:plastin` (modeling-clay barrier/plug/wedge).
- Support products (`re-form`, `plastin`, `promixr`, `dn1`, `lr-2c`, `lr-3c`) have no
  impression specs but still take `product:` tags whenever they are visible in the photo.

**Open** — the only facets where a new value may be created. Event and distributor names cannot
be enumerated in advance; without an explicit exception here, people would invent values in the
closed facets and rot the vocabulary. Use the official name, lowercase, dash-separated:

| Facet | Example |
|---|---|
| `ref:` | `ref:ca-f20-8` `ref:ml-040-ex` `ref:ac-012` `ref:kd-m70` |
| `event:` | `event:global-industrie-2025` — official event name **+ year** |
| `partner:` | `partner:acme-tools` — distributor name |

`app:` mirrors the catalog's own 6 numbered applications, so it matches what sales already say.

## Rights and attribution — native fields, not tags

Piwigo already has the fields for this. Both were **empty/unused** at design time:

| Native field | Use | State at design time |
|---|---|---|
| `author` | **Who to credit** — the credit line itself | empty on all 1189 photos |
| `date_creation` | When it was shot — gives events their year axis, so there is no `year:` facet | 87 % populated |

`rights:` says only what you may *do* with the photo; `author` says *whom* to name:

- `rights:own` — Plastiform shot it. Free use. The default; may be left off.
- `rights:credit` — someone else owns it (typically a distributor). **Publishable only with the
  credit line in `author`.** This is the case that motivated the whole facet.
- `rights:restricted` — permission is limited or unverified. **Ask before any publication.**
  Covers customer sites, identifiable people without written consent, licensed stock.

**Identifiable people.** The public albums are readable by anyone with no password, and this is a
French company: a recognisable face needs consent (GDPR). No consent on file → `rights:restricted`
and `Internal/`, not a public album.

## Derived facets — queryable, never tagged

`family:` `hardness:` `resolution:` `measure:` `cutter:` `color:` — the script expands these into an
OR over matching products. `family:putty` becomes
`product:m25 OR product:m60 OR product:m70 OR product:m80-lp OR product:m80-tlp OR product:m90`;
`color:blue` becomes `product:f50 OR product:p80-ra OR product:m80-lp OR product:m80-tlp`.

## Product table

Source: official Rivelec datasheets (`products_techsheets/`, 23 °C / 50 % RH), consolidated in
`research_and_initial_investigation.md` §1.2. `constraint` = maximum extraction constraint the
replica tolerates.

| product | family | hardness | shore | constraint | elong. | resolution | measure | cutter | note |
|---|---|---|---|---|---|---|---|---|---|
| f20 | fluid | flexible | 18 ±2 ShA | 30 % | 200 % | 1 µm | non-contact | no | **PMUC 04-0141 (nuclear).** Reference for internal threads |
| f30-visual | fluid | flexible | 30 ShA | 20 % | 160 % | 1 µm | non-contact | no | Contrasting black, visual surface finish |
| f30-max | fluid | flexible | 30 ShA | **40 %** | 150 % | 1 µm | non-contact | no | Highest constraint of the range |
| f40 | fluid | flexible | 40 ShA | 35 % | 100 % | 1 µm | non-contact | yes | |
| f50 | fluid | medium | 50 ShA | 10 % | 80 % | 1 µm | contact-possible | yes | **Best seller.** All-rounder |
| f65 | fluid | medium | 65 ShA | 5 % | 100 % | 1 µm | contact-possible | yes | |
| f85 | fluid | rigid | 85 ShA | 0 % | 30 % | 1 µm | contact | no | Contact when it's the only option |
| p25 | pasty | flexible | 25 ShA | 30 % | **300 %** | 1 µm | non-contact | yes | Highest elongation |
| p35 | pasty | flexible | 35 ShA | 20 % | 80 % | 1 µm | non-contact | yes | External forms |
| p80-ra | pasty | rigid | 80 ShA | 0 % | 10 % | 1 µm | contact | no | **Only product for contact Ra.** 1 nm shown in optics |
| p51-sd | pasty | rigid | **51 ShD** | 0 % | 5 % | 1 µm | contact | no | Most rigid *and* fastest (~20 s) |
| m25 | putty | flexible | 25 ShA | 15 % | 130 % | 10 µm | non-contact | yes | |
| m60 | putty | medium | 60 ShA | 5 % | 100 % | 10 µm | contact-possible | yes | |
| m70 | putty | medium | 70 ShA | 5 % | 35 % | 10 µm | contact-possible | yes | **Best seller** of the putty family |
| m80-lp | putty | rigid | 80 ShA | 0 % | 20 % | 10 µm | contact-possible | maybe | Long polymerisation (~25 min) |
| m80-tlp | putty | rigid | 80 ShA | 0 % | 20 % | 10 µm | contact | maybe | **Custom-formulated.** ~60 min |
| m90 | putty | rigid | 90 ShA | 0 % | 10 % | 10 µm | contact | no | |
| f20-xl | xl | flexible | 20 ShA | 30 % | 200 % | 1 µm | non-contact | no | Large volume. **Not the same product as F20** |
| f30-xl | xl | flexible | 30 ShA | 15 % | 150 % | 1 µm | non-contact | no | Large volume |
| f50-xl | xl | medium | 50 ShA | 5 % | 60 % | 1 µm | non-contact | yes | Moulds / series protection |
| f85-xl | xl | rigid | 85 ShA | 0 % | 30 % | 1 µm | contact | no | Large volume, rigid |
| f04-protect | protect | flexible | 04 ±1 ShA | n/a | 260 % | n/a | n/a | n/a | Protection only — **not for measurement** |

Support products (no impression specs): `promixr` `re-form` `plastin` `dn1` `lr-2c` `lr-3c`.

**Datasheets beat the catalog on M25/M60/M70.** `catalog.txt` says 30 % / 20 % / 0 %; that is a
PDF→text conversion artefact. The values above (15 % / 5 % / 5 %) are the datasheet ones.

## Vocabulary discipline

**Only terms attested** in `brand/catalog.txt` or `brand/formation-technique-plastiform.md` are
included. Deliberately **excluded** — no source supports them, do not add them without one:
*weld, crack, gear, keyway, chamfer, fillet, spline*.

**Known transcription errors, not propagated:** `P81RA` → `p80-ra`; `FE20` / `F1` → `f20`.

**Resolution nuance.** Datasheets normalise *impression resolution* to 1 µm (F/P) and 10 µm (M).
Marketing cites finer applicative figures (F30 Visual 0.01 µm of detail, P80 Ra ±0.05 µm of
roughness, 1 nm in optics). These are **different metrics** — don't tag the marketing numbers.

## Legacy tags (transition)

279 photos carry pre-facet bare tags (`M70`, `P80Ra`, `RUGOSITÉ ` — with a trailing space).
Nothing is being bulk-retagged, so `piwigo.py` bridges canonical tokens to legacy spellings
via its `LEGACY` map. Tag lookup is accent-insensitive, so `RUGOSITÉ ` is reachable as `rugosite`.
Once `PIWIGO_RESTRUCTURE.md`'s renames are applied, delete that shim.
