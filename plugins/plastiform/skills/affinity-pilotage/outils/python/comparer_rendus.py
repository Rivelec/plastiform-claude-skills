#!/usr/bin/env python3
"""comparer_rendus.py — compare deux séries de rendus PNG (avant / après une opération) page par page.

Usage : python3 comparer_rendus.py AVANT/ APRES/ [--seuil 64] [--tolerance 200] [--html rapport.html]
  AVANT, APRES : dossiers de PNG de même nom (rendre_pages.js : p1.png, p2.png…, ou <base>_1.png…).
  --seuil      : écart (0-255, maximum des canaux) au-delà duquel un pixel compte comme différent (défaut 64).
  --tolerance  : nombre de pixels différents toléré par page avant de la signaler (défaut 200 : anticrénelage).
  --html       : planche-contact HTML (avant | après | différences en rouge) des pages signalées.
Sortie : une ligne par page signalée ; code retour 0 si aucune page signalée, 1 sinon, 2 en cas d'erreur.
"""
import argparse, html, os, re, sys

def creer_dossier(p):
    """Crée le dossier d'un fichier de sortie s'il n'existe pas (ex. « revue/rapport.md »), renvoie le chemin."""
    d = os.path.dirname(os.path.abspath(p))
    os.makedirs(d, exist_ok=True)
    return p


try:
    from PIL import Image, ImageChops
except ImportError:
    sys.exit("PIL (Pillow) manquant : pip3 install pillow")


def cle(nom):
    nums = re.findall(r"\d+", nom)
    return (int(nums[-1]) if nums else 0, nom)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("avant"); ap.add_argument("apres")
    ap.add_argument("--seuil", type=int, default=64)
    ap.add_argument("--tolerance", type=int, default=200)
    ap.add_argument("--html")
    a = ap.parse_args()
    fa = {f for f in os.listdir(a.avant) if f.lower().endswith(".png")}
    fb = {f for f in os.listdir(a.apres) if f.lower().endswith(".png")}
    communs = sorted(fa & fb, key=cle)
    if not communs:
        print("Aucun PNG commun aux deux dossiers."); return 2
    seules = sorted(fa ^ fb, key=cle)
    signalees, total = [], 0
    ddir = os.path.join(a.apres, "_diff")
    for f in communs:
        A = Image.open(os.path.join(a.avant, f)).convert("RGB")
        B = Image.open(os.path.join(a.apres, f)).convert("RGB")
        if A.size != B.size:
            signalees.append((f, -1, None, "tailles différentes %s / %s" % (A.size, B.size))); continue
        d = ImageChops.difference(A, B)
        r, g, b = d.split()
        m = ImageChops.lighter(ImageChops.lighter(r, g), b)
        masque = m.point(lambda v: 255 if v > a.seuil else 0)
        n = masque.histogram()[255]
        total += n
        if n > a.tolerance:
            bbox = masque.getbbox()
            os.makedirs(ddir, exist_ok=True)
            rouge = Image.new("RGB", B.size, (255, 0, 0))
            vue = Image.composite(rouge, B.point(lambda v: 128 + v // 2), masque)
            vue.save(os.path.join(ddir, f))
            signalees.append((f, n, bbox, ""))
    print("%d page(s) comparée(s), %d signalée(s) (seuil %d, tolérance %d px) ; pixels différents au total : %d"
          % (len(communs), len(signalees), a.seuil, a.tolerance, total))
    for f, n, bbox, note in signalees:
        print("  %s : %s" % (f, note or "%d px différents, zone %s" % (n, bbox)))
    if seules:
        print("  présents d'un seul côté : " + ", ".join(seules[:20]))
    if a.html and signalees:
        rel = lambda p: os.path.relpath(p, os.path.dirname(os.path.abspath(a.html)) or ".")
        lignes = ["<!doctype html><meta charset='utf-8'><title>Comparaison des rendus</title>",
                  "<style>body{font:14px system-ui;margin:16px}figure{display:inline-block;margin:4px;vertical-align:top}"
                  "img{width:300px;border:1px solid #ccc}h2{margin:24px 0 4px}</style>",
                  "<h1>Comparaison des rendus</h1><p>Avant : %s<br>Après : %s<br>%d page(s) signalée(s) sur %d.</p>"
                  % (html.escape(a.avant), html.escape(a.apres), len(signalees), len(communs))]
        for f, n, bbox, note in signalees:
            lignes.append("<h2>%s — %s</h2>" % (html.escape(f), html.escape(note or "%d px différents" % n)))
            for titre, p in (("avant", os.path.join(a.avant, f)), ("après", os.path.join(a.apres, f)), ("différences", os.path.join(ddir, f))):
                if os.path.exists(p):
                    lignes.append("<figure><a href='%s'><img src='%s'></a><figcaption>%s</figcaption></figure>" % (rel(p), rel(p), titre))
        with open(creer_dossier(a.html), "w", encoding="utf-8") as h:
            h.write("\n".join(lignes))
        print("planche-contact : " + a.html)
    return 1 if signalees else 0


if __name__ == "__main__":
    sys.exit(main())
