#!/usr/bin/env python3
"""optimiser_images.py — ramène les images liées à N ppp EFFECTIFS (résolution à leur plus grande taille d'utilisation
dans les documents), sans changer leur taille physique (le DPI enregistré est ajusté), d'après inventaire_liens.json.

Usage : python3 optimiser_images.py INVENTAIRE.json --images DOSSIER_IMAGES [--cible 300] [--marge 1.2]
        [--sortie DOSSIER] [--remplacer] [--aplatir]
  INVENTAIRE.json : produit par affinity/inventaire_liens.js (tous les documents qui utilisent les images).
  --cible   : ppp effectifs visés (300 = qualité imprimeur ; 150-200 pour un document uniquement écran).
  --marge   : ne réduire que si ppp_min > cible × marge (défaut 1.2 : on ne touche pas aux images déjà proches).
  --sortie  : dossier des images réduites (défaut <images>/_optimisees/). Rien n'est modifié dans Images/ sans --remplacer.
  --remplacer : remplace les fichiers dans Images/ (même nom → les liens restent valides) ; originaux déplacés dans
                <images>/_originaux/ (à supprimer après contrôle des rendus).
  --aplatir : TIFF à calques (Photoshop) enregistrés aplatis, 8 bits, compression ZIP.
Formats : JPEG (qualité 92, sous-échantillonnage conservé), TIFF (ZIP), PNG. Les PDF, SVG, EPS, AF ne sont pas touchés.
Profil ICC et mode (CMJN / RVB / niveaux de gris) conservés. Contrôle obligatoire : rendus avant / après.
"""
import argparse, json, os, shutil, sys, tempfile

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow manquant")
Image.MAX_IMAGE_PIXELS = None
FORMATS = {".jpg", ".jpeg", ".tif", ".tiff", ".png"}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("inventaire"); ap.add_argument("--images", required=True)
    ap.add_argument("--cible", type=float, default=300); ap.add_argument("--marge", type=float, default=1.2)
    ap.add_argument("--sortie"); ap.add_argument("--remplacer", action="store_true"); ap.add_argument("--aplatir", action="store_true")
    a = ap.parse_args()
    inv = json.load(open(a.inventaire, encoding="utf-8"))
    fichiers = inv.get("fichiers", {})
    sortie = a.sortie or os.path.join(a.images, "_optimisees")
    os.makedirs(sortie, exist_ok=True)
    gain, n, ignores = 0, 0, []
    for nom, f in sorted(fichiers.items()):
        if f.get("placement") != "lie" or not f.get("ppi_min"):
            continue
        src = os.path.join(a.images, f.get("fichier") or nom)
        ext = os.path.splitext(src)[1].lower()
        if ext not in FORMATS or not os.path.exists(src):
            if ext in FORMATS:
                ignores.append(nom + " (introuvable)")
            continue
        if f["ppi_min"] <= a.cible * a.marge:
            continue
        k = a.cible / f["ppi_min"]
        im = Image.open(src)
        try:
            im.seek(0)
        except EOFError:
            pass
        w, h = im.size
        nw, nh = max(1, round(w * k)), max(1, round(h * k))
        info = dict(im.info)
        dpi = info.get("dpi", (72, 72))
        try:
            dpi = (float(dpi[0]) * k, float(dpi[1]) * k)
        except Exception:
            dpi = (a.cible, a.cible)
        if im.mode not in ("RGB", "RGBA", "CMYK", "L", "LA", "P"):
            im = im.convert("CMYK" if "CMYK" in im.mode else "RGB")
        r = im.resize((nw, nh), Image.LANCZOS)
        cible = os.path.join(sortie, os.path.basename(src))
        opts = {"dpi": dpi}
        if info.get("icc_profile"):
            opts["icc_profile"] = info["icc_profile"]
        if ext in (".jpg", ".jpeg"):
            ss = 0
            try:
                from PIL import JpegImagePlugin
                ss = JpegImagePlugin.get_sampling(im) if im.format == "JPEG" else 0
                ss = 0 if ss == -1 else ss
            except Exception:
                pass
            opts.update(quality=92, subsampling=ss)
            if r.mode in ("RGBA", "LA", "P"):
                r = r.convert("RGB")
        elif ext in (".tif", ".tiff"):
            opts["compression"] = "tiff_adobe_deflate"
        elif ext == ".png":
            opts["optimize"] = True
        fd, tmp = tempfile.mkstemp(suffix=ext); os.close(fd)   # écrit hors du projet, copié seulement si réussi
        try:
            r.save(tmp, format=im.format or None, **opts)
            shutil.copyfile(tmp, cible)
        except Exception as e:
            ignores.append("%s (%s)" % (nom, e)); continue
        finally:
            os.remove(tmp)
        t0, t1 = os.path.getsize(src), os.path.getsize(cible)
        gain += t0 - t1; n += 1
        print("%s : %dx%d → %dx%d (%d → %d ppp effectifs), %.1f → %.1f Mo"
              % (nom, w, h, nw, nh, f["ppi_min"], round(f["ppi_min"] * k), t0 / 1048576, t1 / 1048576))
        if a.remplacer:
            orig = os.path.join(a.images, "_originaux"); os.makedirs(orig, exist_ok=True)
            shutil.move(src, os.path.join(orig, os.path.basename(src)))
            shutil.move(cible, src)
    print("%d image(s) réduite(s), gain %.1f Mo%s" % (n, gain / 1048576, "" if a.remplacer else " — résultats dans " + sortie + " (rien n'est remplacé sans --remplacer)"))
    if ignores:
        print("ignorées : " + ", ".join(ignores[:20]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
