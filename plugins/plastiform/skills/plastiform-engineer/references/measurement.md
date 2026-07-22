# Measurement — instrument, positioning, reliability

Source: training L14. The hardness chosen at selection time already constrains how you can measure.

## Instrument per control
| Control | Instrument | Impression hardness |
|---------|-----------|---------------------|
| Dimensional (internal/external profile) | Profile projector / vision / scan | Any — **non-contact preferred**, mandatory for flexibles |
| Visual surface state | Microscope / vision | Any — non-contact preferred (F30 Visual = glossy black for contrast) |
| Roughness (indirect) | Rugosimeter (contact) or optical | Rigid to semi-rigid for contact — **P80 Ra** is the contact-Ra product |

**P80 Ra specifics** (datasheet + annex): wait **30 min after cure** before the Ra measurement; prefer a
**skidless** rugosimeter (±0.1 µm); optical (non-contact) for Ra < 0.020 µm — resolution demonstrated to 1 nm.

## Shore A ↔ contact rule
- **0-40 ShA:** non-contact only.
- **40-80 ShA:** **non-contact** — datasheets say contact is "potentially usable" on F50/F65/M60,
  but the official guidance (and the Finder) is non-contact for semi-flexibles. Deliberate.
- **80-100 ShA:** contact **or** non-contact — *only if the extraction constraint was 0*.

Non-contact stays the reference for any hardness. A contact instrument on a soft impression deforms it
and falsifies the reading.

## Positioning
**Full impression:** rest it on a support with no mechanical stress; align the useful axis to the optics
(avoid parallax); tune the lighting for a crisp, contrasted outline; read, then repeat ≥2× for
repeatability. Beware — gravity can deform a thin full impression.

**Cutter slice:** lay the 2 mm slice flat on the plate; check the section is parallel; measure the
profile over the full useful length. Slices are the most reliable for profile-projector-type methods.

## Reliability
Thermal stabilisation (impression + part reach shop temperature, cure fully) · controlled lighting
(no stray reflections shifting edges) · a reproducible, repeatable mounting orientation.
**Reliable measurement = valid impression + suitable instrument + stable conditions.**
