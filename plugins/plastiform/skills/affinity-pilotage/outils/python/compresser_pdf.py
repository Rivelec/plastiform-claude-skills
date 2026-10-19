#!/usr/bin/env python3
"""compresser_pdf.py — allège un PDF « écran » avec Ghostscript (images ramenées à N ppp, JPEG), en conservant le
titre, l'auteur, le sujet et les métadonnées XMP. Utile car Affinity ne réduit pas les images d'une BASE liée.

Usage : python3 compresser_pdf.py ENTREE.pdf [ENTREE2.pdf…] [--ppp 150] [--qualite 85] [--suffixe ""] [--remplacer]
  Sans --remplacer, écrit <nom>_compresse.pdf à côté (ou <nom><suffixe>.pdf). Le résultat n'est gardé que s'il est
  plus léger et a le même nombre de pages. Ne pas utiliser pour les PDF imprimeur (fond perdu, CMJN : à laisser tels quels).
"""
import argparse, os, shutil, subprocess, sys, tempfile


def pages(p):
    out = subprocess.run(["pdfinfo", p], capture_output=True, text=True).stdout
    for l in out.splitlines():
        if l.startswith("Pages:"):
            return int(l.split()[1])
    return -1


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("pdfs", nargs="+"); ap.add_argument("--ppp", type=int, default=150)
    ap.add_argument("--qualite", type=int, default=85); ap.add_argument("--suffixe", default="_compresse")
    ap.add_argument("--remplacer", action="store_true")
    a = ap.parse_args()
    try:
        import pikepdf
    except ImportError:
        pikepdf = None
    code = 0
    for p in a.pdfs:
        fd, tmp = tempfile.mkstemp(suffix=".pdf"); os.close(fd)   # hors du dossier du projet (suppression parfois interdite)
        cmd = ["gs", "-q", "-dNOPAUSE", "-dBATCH", "-dSAFER", "-sDEVICE=pdfwrite", "-dCompatibilityLevel=1.6",
               "-dDownsampleColorImages=true", "-dDownsampleGrayImages=true", "-dDownsampleMonoImages=false",
               "-dColorImageResolution=%d" % a.ppp, "-dGrayImageResolution=%d" % a.ppp,
               "-dColorImageDownsampleThreshold=1.2", "-dGrayImageDownsampleThreshold=1.2",
               "-dColorImageDownsampleType=/Bicubic", "-dGrayImageDownsampleType=/Bicubic",
               "-dAutoFilterColorImages=false", "-dColorImageFilter=/DCTEncode", "-dAutoFilterGrayImages=false",
               "-dGrayImageFilter=/DCTEncode", "-dJPEGQ=%d" % a.qualite, "-dColorConversionStrategy=/LeaveColorUnchanged",
               "-dEmbedAllFonts=true", "-dSubsetFonts=true", "-dDetectDuplicateImages=true", "-dPreserveAnnots=true",
               "-sOutputFile=" + tmp, p]
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode != 0 or not os.path.exists(tmp):
            print("%s : ERREUR Ghostscript %s" % (p, r.stderr[-300:])); code = 1; continue
        if pages(tmp) != pages(p):
            print("%s : nombre de pages différent après compression, résultat rejeté" % p); os.remove(tmp); code = 1; continue
        if pikepdf:
            try:
                with pikepdf.open(p) as src, pikepdf.open(tmp, allow_overwriting_input=True) as dst:
                    for k in ("/Title", "/Author", "/Subject", "/Keywords"):
                        if k in src.docinfo:
                            dst.docinfo[k] = pikepdf.String(str(src.docinfo[k]))
                    if "/Metadata" in src.Root:
                        dst.Root.Metadata = dst.copy_foreign(src.Root.Metadata)
                    dst.save(tmp + ".m.pdf")
                os.replace(tmp + ".m.pdf", tmp)
            except Exception as e:
                print("   métadonnées non recopiées : %s" % e)
        t0, t1 = os.path.getsize(p), os.path.getsize(tmp)
        if t1 >= t0:
            print("%s : pas de gain (%.1f → %.1f Mo), original conservé" % (os.path.basename(p), t0 / 1048576, t1 / 1048576)); os.remove(tmp); continue
        cible = p if a.remplacer else os.path.splitext(p)[0] + a.suffixe + ".pdf"
        shutil.copyfile(tmp, cible); os.remove(tmp)   # copie (réécriture) plutôt que déplacement : pas de suppression dans le dossier
        print("%s : %.1f → %.1f Mo (−%d %%) → %s" % (os.path.basename(p), t0 / 1048576, t1 / 1048576, round(100 - 100.0 * t1 / t0), os.path.basename(cible)))
    return code


if __name__ == "__main__":
    sys.exit(main())
