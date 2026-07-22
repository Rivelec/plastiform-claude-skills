# Recognition — a product, and an impression

## Decode a reference
`[letter][Shore A][suffix]` — training L5.
- **Letter** = initial consistency: **F** fluid · **P** pasty · **M** malleable (Manual putty).
- **Number** = cured Shore A hardness → flexible 0-40 · medium 40-80 · rigid 80-100.
- **Suffix**: **Ra** roughness-Ra contact · **LP** long polymerisation · **SD** Shore D · **XL** large
  volume · **Visual** optical inspection · **Max** max elongation/constraint.
- Exception: **P51 SD** is Shore **D** (≈ >100 ShA), the most rigid.

Example reads: `F20` = fluid, very soft (undercuts/threads). `P80 Ra` = pasty, rigid, roughness-Ra.
`M70` = malleable, medium (external, hand-applied). `M80 LP` = malleable, rigid, long cure.

## Physical cues (product in hand)
- **Packaging** ⇒ consistency: 50 ml cartridge = F or P; 900 ml pot = M; 400 ml/bottle/drum = XL (fluid).
- **Flex test:** stretch a strip — flexible springs back strongly (F20), rigid barely moves (F85, P51 SD).
- For a definitive spec, decode the reference and check `products.md`; don't infer numbers by eye.

## Color — the first visual cue

Exact tints pixel-sampled from each datasheet's product color code (all 22 FTEs, 2026-07-22).
**Color gives a shortlist, not an ID** — families overlap. Disambiguate with packaging
(cartridge / pot / XL), then the flex test.

**Datasheet tint ≠ cured-photo tint.** Cured material under real lighting shifts: cured
**M25 photographs *lighter* than P25** — the reverse of what the sage/teal hexes suggest
(field correction, 2026-07). Within any look-alike pair, never decide on tint alone —
settle it with packaging, the flex test, or a library comparison (below).

| Product | Exact tint | Hex | Family neighbours to rule out |
|---------|-----------|-----|-------------------------------|
| **F20** | pistachio green | `#83c07b` | M25 sage green (pot, not cartridge) |
| **M25** | sage green | `#71a078` | F20 pistachio (cartridge) · P25 teal — **cured M25 photographs lighter than P25** |
| **F50** | sky blue | `#8abfe3` | P80 Ra azure (stronger), M80 navy (pots) |
| **P80 Ra** | azure blue | `#179cd8` | F50 sky blue (paler) |
| **M80 LP / TLp** | navy blue | `#2a3578` | — (only navy; LP vs TLp: cure time) |
| **F65** | burnt orange | `#cb542f` | P35 salmon (paler), P51 SD coral |
| **P35** | salmon | `#f1a48a` | P51 SD coral (redder — and far harder) |
| **P51 SD** | coral pink | `#ef9490` | P35 salmon; flex test settles it instantly |
| **P25** | teal | `#00aaac` | M60 turquoise (pot, slightly lighter) · M25 (cured, photographs lighter still) |
| **M60** | turquoise | `#2db6b5` | P25 teal (cartridge) |
| **F30 Max / F30 XL** | mauve purple | `#9c8cae` | **same tint** — 50 ml cartridge vs 400 ml XL |
| **F30 Visual** | black (cures **glossy**) | `#0c0c09` | F50 XL black (XL, matte) |
| **F50 XL** | black | `#010303` | F30 Visual (glossy, 50 ml) |
| **F40** | white | — | — |
| **F20 XL** | rose pink | `#efa0b7` | — |
| **F85** | mid grey | `#939191` | M70 lighter, M90 darker, F85 XL palest |
| **M70** | light grey | `#a19f9e` | F85 (cartridge), M90 (darker pot) |
| **M90** | slate grey | `#45575a` | M70 (lighter, softer) |
| **F85 XL** | pale grey | `#dddddd` | — (XL packaging) |
| **F04 Protect** | yellow code, cures **translucent** | `#fce800` | — |

Confirm a color-based guess against real photos: `plastiform-media` → `piwigo.py tags product:<ref>`
(or `tags color:<tint> --mode or` — matches by substring, so `color:grey` hits all four greys).

## Support products in frame — not the impression

A white or translucent shapeless mass touching the part is usually a **support product**,
not the impression. Identify it by role, and (when tagging photos) tag it as a second
`product:` alongside the impression product:

- **Re-Form** — reusable thermoplastic. **Translucent in its hot soft state, opaque white once
  cooled.** Roles: dam **bridged around a pour zone** to stop a fluid flowing, holding **bed** a
  part is pressed into, custom **fixation base** (incl. vertical surfaces), anti-resonance
  support during machining, mechanical reinforcement (catalog p.30-31).
- **Plastin** — reusable non-greasy modeling clay. Roles: flow **barrier**, through-hole
  **plug**, positioning **wedge**, dust lift (`accessories.md`).
- Not to be confused with the **filin** (`accessory:fill-in` in the media taxonomy) — a thin
  metal bubble-chasing wire, despite the paste-sounding name.

## Is this a good impression?
Good = uniform surface (no uncured/tacky zone), **no bubble on the measurement zone**, no dust/grease
residue, geometry continuous. Then it's measurable.

Defect → likely cause (see `troubleshooting.md`): bubbles at a bore bottom ⇒ tip lifted / no filin ·
tacky surface ⇒ grease or bad mix ⇒ won't cure · torn/incomplete ⇒ constraint too high or unscrewed on
extraction · smeared fine detail on a malleable ⇒ striated face used against the part.

## Compare against real photos

The media library holds labelled reference shots — fetch a comparison set with the
**`plastiform-media`** skill and view them next to the user's photo:

```bash
python3 piwigo.py tags shot:replica --mode and       # cured impression close-ups (~15)
python3 piwigo.py tags product:<ref> --mode and      # a specific product in situ
python3 piwigo.py search "<application, FR or EN>"   # e.g. "rugosité tube", "gorge interne"
```

Caveat: only ~24 % of the library is tagged — a thin `tags` result ≠ no photos; retry with
`search` and French terms.
