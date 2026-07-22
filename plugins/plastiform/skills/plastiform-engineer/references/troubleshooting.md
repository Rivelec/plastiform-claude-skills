# Troubleshooting — bad impression → cause → fix

Source: training L13. Diagnose cause-and-effect; **never "correct" by adjusting the measurement.**
Most failures come from the triad: **degrease · mix · extraction.**

| Symptom | Probable cause | Fix |
|---------|----------------|-----|
| **Bubbles** in the impression | Tip left the product; injected too fast; not in contact with the surface | Inject with the tip immersed; rub the walls; use a **filin** for tiny bores |
| **Incomplete cure** (tacky) | Grease/acetone present; **inhibitor contact: latex (gloves!), sulfur, graphite, some titanium alloys**; non-homogeneous mix; too cold; expired product | Uniform colour (test drop); work near 20 °C; check expiry; **always DN1**, never acetone; test drop on the material if inhibition suspected |
| **Impression stuck to the part** | Greasy surface; undercut not anticipated | DN1 (never acetone); recompute the constraint; pick a more flexible product |
| **Impression broke on extraction** | Product not resistant enough or too rigid; extracted by rotation; grip too small | Recompute C; step up resistance; **pull straight** with an adequate grip (demolding ring) |
| **Inconsistent dimensions** | Polluted surface; extreme ambient temperature; impression not stabilised | Degrease; work near 20 °C; let the impression stabilise thermally before measuring |
| **Jams / won't extract** | `dmos` overstated — read as the bore Ø instead of the **tightest exit passage** → product too rigid | Retrace the extraction path on the drawing, recompute C with the true smallest section, rerun the finder |
| **Product ran off before curing** | Fluid (F) used on an external / open form | External forms take **P** (gun) or **M** (hand) — rerun the finder with `--inner-shape outside` |

## Quality check before measuring
- Surface uniform — no visibly uncured zone
- Measurement zone bubble-free — no cavity on the critical area
- No residue — no dust, no greasy mark

**Recheck the constraint calculation whenever extraction is difficult.** When in doubt, redoing the
impression is more reliable than trusting an uncertain result.
