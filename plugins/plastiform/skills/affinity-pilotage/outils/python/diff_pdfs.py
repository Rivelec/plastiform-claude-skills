#!/usr/bin/env python3
"""diff_pdfs.py — ce qui a changé entre deux versions d'un PDF (ou deux dossiers d'exports), page par page, et un
brouillon d'entrées de CHANGELOG.

Usage : python3 diff_pdfs.py ANCIEN NOUVEAU [--md diff.md] [--json diff.json] [--visuel] [--ppp 40]
  ANCIEN, NOUVEAU : deux PDF, ou deux dossiers (appariement par nom, la version « _V1.0 » / « _V1-2 » étant ignorée).
  --visuel : compare aussi les rendus (pdftoppm, basse définition) pour repérer les changements d'images ou de mise
             en page sans changement de texte.
Le texte est comparé mot à mot dans chaque page ; les pages ajoutées ou supprimées sont signalées.
"""
import argparse, difflib, json, os, re, subprocess, sys, tempfile

def creer_dossier(p):
    """Crée le dossier d'un fichier de sortie s'il n'existe pas (ex. « revue/rapport.md »), renvoie le chemin."""
    d = os.path.dirname(os.path.abspath(p))
    os.makedirs(d, exist_ok=True)
    return p


RX_VERSION = re.compile(r"_V\d+(?:[.-]\d+)*(?=\.pdf$|_)", re.I)


def pages_texte(p):
    out = subprocess.run(["pdftotext", "-q", "-layout", p, "-"], capture_output=True, text=True, errors="replace").stdout
    return [re.sub(r"[ \t]+", " ", pg).strip() for pg in out.split("\f")][:-1] or [""]


def diff_mots(a, b, contexte=6):
    A, B = a.split(), b.split()
    sm = difflib.SequenceMatcher(None, A, B, autojunk=False)
    res = []
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op == "equal":
            continue
        avant = " ".join(A[max(0, i1 - contexte):i1])
        res.append({"op": op, "ancien": " ".join(A[i1:i2]), "nouveau": " ".join(B[j1:j2]), "contexte": avant[-60:]})
    return res


def rendus(p, d, ppp):
    subprocess.run(["pdftoppm", "-r", str(ppp), "-png", p, os.path.join(d, "p")], capture_output=True)
    return sorted(os.path.join(d, f) for f in os.listdir(d) if f.endswith(".png"))


def ecart_visuel(a, b):
    from PIL import Image, ImageChops
    A, B = Image.open(a).convert("L"), Image.open(b).convert("L")
    if A.size != B.size:
        return 100.0
    h = ImageChops.difference(A, B).histogram()
    return round(100.0 * sum(h[40:]) / (A.size[0] * A.size[1]), 2)


def comparer(ancien, nouveau, visuel, ppp):
    ta, tb = pages_texte(ancien), pages_texte(nouveau)
    r = {"ancien": ancien, "nouveau": nouveau, "pages": [len(ta), len(tb)], "changements": []}
    for i in range(max(len(ta), len(tb))):
        if i >= len(ta):
            r["changements"].append({"page": i + 1, "type": "page ajoutée", "detail": tb[i][:200]}); continue
        if i >= len(tb):
            r["changements"].append({"page": i + 1, "type": "page supprimée", "detail": ta[i][:200]}); continue
        ds = diff_mots(ta[i], tb[i])
        # un même passage supprimé ici et ajouté ailleurs sur la page = ordre d'extraction différent, pas un changement
        ins = [d["nouveau"] for d in ds if d["op"] == "insert"]
        dels = [d["ancien"] for d in ds if d["op"] == "delete"]
        deplaces = set(x for x in ins if x in dels)
        for d in ds:
            if (d["op"] == "insert" and d["nouveau"] in deplaces) or (d["op"] == "delete" and d["ancien"] in deplaces):
                continue
            r["changements"].append({"page": i + 1, "type": "texte", **d})
        if deplaces:
            r.setdefault("deplaces", []).append({"page": i + 1, "passages": sorted(deplaces)})
    if visuel:
        with tempfile.TemporaryDirectory() as da, tempfile.TemporaryDirectory() as db:
            ra, rb = rendus(ancien, da, ppp), rendus(nouveau, db, ppp)
            pages_txt = {c["page"] for c in r["changements"]}
            for i, (x, y) in enumerate(zip(ra, rb)):
                e = ecart_visuel(x, y)
                if e > 0.05 and (i + 1) not in pages_txt:
                    r["changements"].append({"page": i + 1, "type": "visuel", "detail": "%.2f %% de la page modifiée (image, couleur ou mise en page ?)" % e})
    r["changements"].sort(key=lambda c: c["page"])
    return r


def apparier(da, db):
    cle = lambda f: RX_VERSION.sub("", f)
    A = {cle(f): f for f in os.listdir(da) if f.lower().endswith(".pdf")}
    B = {cle(f): f for f in os.listdir(db) if f.lower().endswith(".pdf")}
    paires = [(os.path.join(da, A[k]), os.path.join(db, B[k])) for k in sorted(A.keys() & B.keys())]
    return paires, sorted(A.keys() - B.keys()), sorted(B.keys() - A.keys())


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("ancien"); ap.add_argument("nouveau")
    ap.add_argument("--md"); ap.add_argument("--json"); ap.add_argument("--visuel", action="store_true")
    ap.add_argument("--ppp", type=int, default=40)
    a = ap.parse_args()
    if os.path.isdir(a.ancien):
        paires, seuls_a, seuls_b = apparier(a.ancien, a.nouveau)
    else:
        paires, seuls_a, seuls_b = [(a.ancien, a.nouveau)], [], []
    res = [comparer(x, y, a.visuel, a.ppp) for x, y in paires]
    md = ["# Différences entre versions", ""]
    if seuls_a: md += ["Uniquement dans l'ancienne série : " + ", ".join(seuls_a), ""]
    if seuls_b: md += ["Uniquement dans la nouvelle série : " + ", ".join(seuls_b), ""]
    brouillon = []
    for r in res:
        nom = os.path.basename(r["nouveau"])
        md += ["## " + nom, "", "Pages : %d → %d ; %d changement(s)" % (r["pages"][0], r["pages"][1], len(r["changements"]))
               + (" ; texte seulement déplacé (ordre d'extraction) p. %s" % ", ".join(str(x["page"]) for x in r["deplaces"]) if r.get("deplaces") else ""), ""]
        for c in r["changements"][:300]:
            if c["type"] == "texte":
                quoi = ("« %s » → « %s »" % (c["ancien"], c["nouveau"])) if c["op"] == "replace" else (("ajout : « %s »" % c["nouveau"]) if c["op"] == "insert" else "suppression : « %s »" % c["ancien"])
                md.append("- p.%d : %s  _(…%s)_" % (c["page"], quoi, c["contexte"][-40:]))
                brouillon.append("- p. %d : %s" % (c["page"], quoi))
            else:
                md.append("- p.%d : %s — %s" % (c["page"], c["type"], c.get("detail", "")))
                brouillon.append("- p. %d : %s" % (c["page"], c["type"]))
        md.append("")
    vus, uniques = set(), []
    for l in brouillon:
        k = re.sub(r"^- p\. \d+ : ", "", l)
        if k not in vus:
            vus.add(k); uniques.append(l)
    md += ["## Brouillon pour CHANGELOG.md (à relire, regrouper et reformuler)", ""] + uniques[:200] + [""]
    texte = "\n".join(md) + "\n"
    if a.md:
        open(creer_dossier(a.md), "w", encoding="utf-8").write(texte)
    if a.json:
        json.dump(res, open(creer_dossier(a.json), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(texte if len(texte) < 8000 else texte[:8000] + "\n… (complet : %s)" % (a.md or a.json or "--md"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
