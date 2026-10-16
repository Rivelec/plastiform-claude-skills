#!/usr/bin/env python3
"""pixels_vers_fichiers.py — convertit les calques pixel extraits par affinity/extraire_pixels.js (<nom>.raw + <nom>.json)
en fichiers image à lier : TIFF CMJN (+ alpha non prémultiplié) pour un document CMJN, PNG pour un document RVB.

Usage : python3 pixels_vers_fichiers.py DOSSIER [--recadrer] [--sortie DOSSIER]
  --recadrer : retire les bords entièrement transparents (la boîte du .json est alors ajustée : voir <nom>.final.json).
Le .raw contient les octets du calque : 5 canaux (CMJNA 8 bits) ou 4 canaux (RVBA 8 bits), alpha NON prémultiplié.
Contrôle indispensable ensuite : rendre les pages avant / après remplacement et les comparer (comparer_rendus.py).
"""
import argparse, json, os, subprocess, sys, tempfile

import numpy as np


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("dossier"); ap.add_argument("--recadrer", action="store_true"); ap.add_argument("--sortie")
    a = ap.parse_args()
    out = a.sortie or a.dossier
    os.makedirs(out, exist_ok=True)
    n = 0
    for f in sorted(os.listdir(a.dossier)):
        if not f.endswith(".json") or f.endswith(".final.json"):
            continue
        meta = json.load(open(os.path.join(a.dossier, f), encoding="utf-8"))
        raw = os.path.join(a.dossier, f[:-5] + ".raw")
        if not os.path.exists(raw):
            continue
        w, h = meta["largeur"], meta["hauteur"]
        data = np.fromfile(raw, dtype=np.uint8)
        c = data.size // (w * h)
        if c not in (4, 5) or data.size != w * h * c:
            print("%s : taille inattendue (%d octets pour %dx%d)" % (f, data.size, w, h)); continue
        img = data.reshape(h, w, c)
        boite = meta.get("boite")
        if meta.get("local"):   # canevas → zone peinte (correspond exactement à « boite »)
            lx, ly, lw, lh = meta["local"]
            cx0, cy0 = max(0, int(round(lx))), max(0, int(round(ly)))
            cx1, cy1 = min(w, int(round(lx + lw))), min(h, int(round(ly + lh)))
            if cx1 > cx0 and cy1 > cy0 and (cx0, cy0, cx1, cy1) != (0, 0, w, h):
                img = img[cy0:cy1, cx0:cx1]; h, w = img.shape[:2]
        alpha = img[:, :, c - 1]
        x0, y0, x1, y1 = 0, 0, w, h
        if a.recadrer:
            ys, xs = np.nonzero(alpha)
            if xs.size:
                x0, x1, y0, y1 = int(xs.min()), int(xs.max()) + 1, int(ys.min()), int(ys.max()) + 1
                img = img[y0:y1, x0:x1]; alpha = img[:, :, c - 1]
        opaque = bool((alpha == 255).all())
        base = os.path.join(out, f[:-5])
        fd, tmp = tempfile.mkstemp(suffix=".raw"); os.close(fd)   # hors du dossier du projet (suppression parfois interdite)
        hh, ww = img.shape[:2]
        if c == 5:
            cible = base + ".tif"
            if opaque:
                np.ascontiguousarray(img[:, :, :4]).tofile(tmp)
                cmd = ["convert", "-size", "%dx%d" % (ww, hh), "-depth", "8", "cmyk:" + tmp, "-compress", "zip", cible]
            else:
                img.tofile(tmp)
                cmd = ["convert", "-size", "%dx%d" % (ww, hh), "-depth", "8", "cmyka:" + tmp, "-define", "tiff:alpha=unassociated", "-compress", "zip", cible]
        else:
            cible = base + ".png"
            (np.ascontiguousarray(img[:, :, :3]) if opaque else img).tofile(tmp)
            cmd = ["convert", "-size", "%dx%d" % (ww, hh), "-depth", "8", ("rgb:" if opaque else "rgba:") + tmp, cible]
        r = subprocess.run(cmd, capture_output=True, text=True)
        os.remove(tmp)
        if r.returncode:
            print("%s : ERREUR ImageMagick %s" % (f, r.stderr[-200:])); continue
        fin = dict(meta)
        fin["fichier"] = os.path.basename(cible); fin["opaque"] = opaque
        if a.recadrer and boite and (x0, y0, x1, y1) != (0, 0, w, h):
            bx, by, bw, bh = boite; sx, sy = bw / w, bh / h
            fin["boite"] = [bx + x0 * sx, by + y0 * sy, (x1 - x0) * sx, (y1 - y0) * sy]
            fin["recadrage_px"] = [x0, y0, x1, y1]
        json.dump(fin, open(base + ".final.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print("%s → %s (%dx%d, %s, %.1f Mo)" % (f[:-5], os.path.basename(cible), ww, hh, "opaque" if opaque else "avec transparence", os.path.getsize(cible) / 1048576))
        n += 1
    print("%d fichier(s) produit(s) dans %s" % (n, out))
    return 0


if __name__ == "__main__":
    sys.exit(main())
