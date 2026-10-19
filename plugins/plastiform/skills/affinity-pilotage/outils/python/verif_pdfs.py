#!/usr/bin/env python3
r"""verif_pdfs.py — contrôle qualité des PDF exportés, avec un rapport classé par gravité (CRITIQUE / MAJEUR / MINEUR).

Usage : python3 verif_pdfs.py CHEMIN [CHEMIN…] [--projet DOSSIER/projet.json] [--md rapport.md] [--json rapport.json]
        [--pages N] [--ppp-min 150] [--taille-max-mo 40] [--requis TEXTE…] [--interdits TEXTE…]
        [--modele '{support}_{langue}_{variante}_{ref}.pdf'] [--motif-ref 'BRO_RIV_\d+_\d{4}_V[\d.]+']
  CHEMIN : PDF ou dossier de PDF (non récursif).
Contrôles, pour chaque PDF :
  - structure (qpdf --check), nombre de pages, format (mm), fond perdu (MediaBox - TrimBox) ;
  - polices : toutes incorporées (pdffonts) ; polices de substitution suspectes (Arial/Helvetica/Times inattendues) ;
  - images : résolution effective minimale (pdfimages -list), images en RVB dans un PDF imprimeur ;
  - métadonnées : titre présent (et contenant la référence si verifications.titre_contient_ref) ; référence du nom de
    fichier (gabarit nom_fichier ou decoupage.nom_fichier de projet.json) imprimée dans le texte ;
  - textes requis / interdits (par projet, par variante) ; textes de remplissage (Lorem ipsum, XXX, ??, TODO) ;
  - taille maximale par support.
Les règles viennent de la section "verifications" de projet.json (voir modeles/projet.catalogue.json) et des options.
Code retour : 0 aucun CRITIQUE ni MAJEUR, 1 sinon, 2 erreur d'utilisation.
"""
import argparse, json, os, re, subprocess, sys

def creer_dossier(p):
    """Crée le dossier d'un fichier de sortie s'il n'existe pas (ex. « revue/rapport.md »), renvoie le chemin."""
    d = os.path.dirname(os.path.abspath(p))
    os.makedirs(d, exist_ok=True)
    return p


GRAV = ("CRITIQUE", "MAJEUR", "MINEUR")
# textes de remplissage ou notes de travail oubliées : (motif, insensible à la casse ?) — « todo » est un mot espagnol,
# « à vérifier » une tournure courante : seules les formes en MAJUSCULES sont signalées.
REMPLISSAGE = [(r"lorem ipsum", True), (r"\bXXX+\b", False), (r"\?{3,}", False), (r"\bTODO\b", False), (r"\bTBD\b", False),
               (r"\bFIXME\b", False), (r"#REF!", False), (r"\[\s*à compléter\s*\]", True),
               (r"\b[AÀ] (?:SUPPRIMER|V[EÉ]RIFIER|COMPL[EÉ]TER|TRADUIRE|CORRIGER|REMPLACER|VALIDER)\b", False)]


def run(cmd):
    p = subprocess.run(cmd, capture_output=True, text=True, errors="replace")
    return p.returncode, p.stdout, p.stderr


def pdfinfo(p):
    _, out, _ = run(["pdfinfo", "-box", p])
    d = {}
    for l in out.splitlines():
        if ":" in l:
            k, v = l.split(":", 1); d[k.strip()] = v.strip()
    return d


def boites(info):
    def bx(k):
        v = info.get(k)
        return [float(x) for x in v.split()] if v else None
    return bx("Page    1 MediaBox") or bx("MediaBox"), bx("Page    1 TrimBox") or bx("TrimBox")


def gabarit_regex(modele, connus=None, motif_ref=None):
    """'{support}_{langue}_{variante}_{ref}.pdf' -> regex à groupes nommés ; les valeurs connues du projet (variantes,
    supports, langues) sont essayées de la plus longue à la plus courte (UNCETA_SP avant SP)."""
    connus = connus or {}
    rx = ""
    for p in re.split(r"(\{\w+\})", modele):
        m = re.fullmatch(r"\{(\w+)\}", p)
        if not m:
            rx += re.escape(p); continue
        nom = m.group(1)
        if connus.get(nom):
            rx += "(?P<%s>%s)" % (nom, "|".join(re.escape(x) for x in sorted(connus[nom], key=len, reverse=True)))
        elif nom == "ref":
            rx += "(?P<ref>%s)" % (motif_ref or ".+")
        else:
            rx += "(?P<%s>[^_]+)" % nom
    return re.compile("^" + rx + "$")


def charger_projet(chemin):
    if not chemin:
        return {}
    with open(chemin, encoding="utf-8") as f:
        j = json.load(f)
    if os.path.basename(chemin) == "catalogue.json":   # ancien format : converti comme projet.py convertir
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        from projet import convertir_dict
        j = convertir_dict(j)
    return j


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("chemins", nargs="+")
    ap.add_argument("--projet"); ap.add_argument("--md"); ap.add_argument("--json")
    ap.add_argument("--pages", type=int); ap.add_argument("--ppp-min", type=float)
    ap.add_argument("--taille-max-mo", type=float)
    ap.add_argument("--requis", nargs="*", default=[]); ap.add_argument("--interdits", nargs="*", default=[])
    ap.add_argument("--modele", help="gabarit des noms de fichiers, ex. '{support}_{langue}_{variante}_{ref}.pdf'")
    ap.add_argument("--motif-ref", help="expression régulière de la référence imprimée")
    a = ap.parse_args()
    pdfs = []
    for c in a.chemins:
        if os.path.isdir(c):
            pdfs += sorted(os.path.join(c, f) for f in os.listdir(c) if f.lower().endswith(".pdf"))
        elif c.lower().endswith(".pdf"):
            pdfs.append(c)
    if not pdfs:
        print("Aucun PDF."); return 2
    pj = charger_projet(a.projet)
    V = dict(pj.get("verifications", {}))
    if a.pages: V["pages"] = a.pages
    if a.ppp_min: V["ppp_min"] = a.ppp_min
    if a.taille_max_mo: V["taille_max_mo"] = a.taille_max_mo
    dec = pj.get("decoupage") or {}
    motif_ref = a.motif_ref or (pj.get("reference") or {}).get("motif") or (re.sub(r"^\^|\$$", "", dec["reference"]) if dec.get("reference") else None)
    langues = list((pj.get("fichiers") or {}).get("langues") or {}) or sorted({e.get("langue") for e in pj.get("exports", []) if e.get("langue")})
    connus = {"variante": list(pj.get("variantes") or {}), "support": list(pj.get("supports") or {}), "langue": langues}
    modele = a.modele or pj.get("nom_fichier") or dec.get("nom_fichier")   # sans projet ni --modele : noms non analysés
    rx_nom = gabarit_regex(modele, connus, motif_ref) if modele else None
    titre_ref = V.get("titre_contient_ref", bool(pj.get("nom_fichier")))
    resultats = []
    for p in pdfs:
        nom = os.path.basename(p); pb = []
        add = lambda g, m: pb.append((g, m))
        champs = {}
        m = rx_nom.match(nom) if rx_nom else None
        if m:
            champs = m.groupdict()
        elif rx_nom:
            add("MINEUR", "nom de fichier hors convention (%s)" % modele)
        ref = champs.get("ref", "")
        if not ref and motif_ref:
            mm = re.search(motif_ref, nom); ref = mm.group(0) if mm else ""
        support, variante = champs.get("support"), champs.get("variante")
        # structure
        rc, out, err = run(["qpdf", "--check", p])
        if rc not in (0, 3):
            add("CRITIQUE", "structure PDF invalide (qpdf) : " + (err or out).strip().splitlines()[-1][:200])
        info = pdfinfo(p)
        n = int(info.get("Pages", "0") or 0)
        if V.get("pages") and n != V["pages"]:
            add("CRITIQUE", "%d pages au lieu de %d" % (n, V["pages"]))
        media, trim = boites(info)
        fp_mm = None
        if media and trim:
            fp_mm = round((media[2] - media[0] - (trim[2] - trim[0])) / 2 * 25.4 / 72, 2)
        fp_att = (V.get("fond_perdu_mm") or {}).get(support) if support else None
        if fp_att is not None and fp_mm is not None and abs(fp_mm - fp_att) > 0.3:
            add("CRITIQUE", "fond perdu %.1f mm au lieu de %s mm" % (fp_mm, fp_att))
        taille = os.path.getsize(p) / 1048576
        tmax = V.get("taille_max_mo")
        if isinstance(tmax, dict):
            tmax = tmax.get(support)
        if tmax and taille > tmax:
            add("MAJEUR", "%.1f Mo (maximum %s Mo)" % (taille, tmax))
        # polices
        _, out, _ = run(["pdffonts", p])
        lignes = out.splitlines()[2:]
        non_inc, polices = [], set()
        for l in lignes:
            cols = l.split()
            if len(cols) < 5:
                continue
            # colonnes de fin : emb sub uni object ID
            emb = cols[-5] if len(cols) >= 7 else "?"
            polices.add(cols[0])
            if emb == "no":
                non_inc.append(cols[0])
        if non_inc:
            add("CRITIQUE", "polices NON incorporées : " + ", ".join(sorted(set(non_inc))))
        attendues = V.get("polices_autorisees")
        if attendues:
            hors = sorted(f for f in polices if not any(re.search(x, f, re.I) for x in attendues))
            if hors:
                add("MAJEUR", "polices inattendues (substitution ?) : " + ", ".join(hors[:10]))
        # images
        _, out, _ = run(["pdfimages", "-list", p])
        basses, rvb = [], 0
        for l in out.splitlines()[2:]:
            c = l.split()
            if len(c) < 14 or c[2] not in ("image", "smask", "mask"):
                continue
            if c[2] != "image":
                continue
            try:
                xppi, yppi = float(c[12]), float(c[13])
            except ValueError:
                continue
            if c[5] == "rgb":
                rvb += 1
            if V.get("ppp_min") and min(xppi, yppi) < 0.95 * V["ppp_min"] and int(c[3]) > 32 and int(c[4]) > 32:   # 5 % de marge (arrondis)
                basses.append("p%s %dppp (%sx%s)" % (c[0], min(xppi, yppi), c[3], c[4]))
        if basses:
            add("MAJEUR", "%d image(s) sous %s ppp : %s" % (len(basses), V["ppp_min"], ", ".join(basses[:8])))
        if rvb and support and support in (V.get("supports_cmjn") or []):
            add("MINEUR", "%d image(s) RVB dans un PDF imprimeur" % rvb)
        # textes
        _, texte, _ = run(["pdftotext", "-q", p, "-"])
        if not texte.strip():
            add("MAJEUR", "aucun texte extractible (texte vectorisé ou PDF image ?)")
        titre = info.get("Title", "")
        if not titre:
            add("MINEUR", "titre du PDF vide")
        elif ref and titre_ref and ref not in titre:
            add("MINEUR", "titre du PDF sans la référence %s : « %s »" % (ref, titre))
        if ref and V.get("reference_imprimee", True) and ref not in texte:
            add("CRITIQUE", "référence %s (nom du fichier) absente du texte imprimé" % ref)
        if motif_ref:
            autres = sorted(set(re.findall(motif_ref, texte)) - {ref})
            if autres:
                add("CRITIQUE", "autre(s) référence(s) imprimée(s) : " + ", ".join(autres[:5]))
        for t, casse in REMPLISSAGE:
            for mm in list(re.finditer(t, texte, re.I if casse else 0))[:3]:
                ctx = re.sub(r"\s+", " ", texte[max(0, mm.start() - 50):mm.end() + 30]).strip()
                add("MAJEUR", "texte de remplissage ou note oubliée « %s » : …%s…" % (mm.group(0), ctx))
        regles_var = (V.get("variantes") or {}).get(variante, {}) if variante else {}
        for t in list(V.get("requis", [])) + list(regles_var.get("requis", [])) + a.requis:
            if t not in texte:
                add("CRITIQUE", "texte requis absent : « %s »" % t)
        for t in list(V.get("interdits", [])) + list(regles_var.get("interdits", [])) + a.interdits:
            if t in texte:
                k = texte.count(t)
                add("CRITIQUE", "texte interdit présent %d fois : « %s »" % (k, t))
        resultats.append({"pdf": p, "nom": nom, "pages": n, "mo": round(taille, 1), "fond_perdu_mm": fp_mm,
                          "titre": titre, "champs": champs, "problemes": [{"gravite": g, "message": m} for g, m in pb]})
    # rapport
    cpt = {g: sum(1 for r in resultats for x in r["problemes"] if x["gravite"] == g) for g in GRAV}
    md = ["# Contrôle des PDF", "", "%d PDF — %d CRITIQUE, %d MAJEUR, %d MINEUR" % (len(resultats), cpt["CRITIQUE"], cpt["MAJEUR"], cpt["MINEUR"]), ""]
    for g in GRAV:
        items = [(r, x) for r in resultats for x in r["problemes"] if x["gravite"] == g]
        if items:
            md += ["## " + g, ""] + ["- **%s** : %s" % (r["nom"], x["message"]) for r, x in items] + [""]
    md += ["## Synthèse", "", "| PDF | pages | Mo | fond perdu | titre |", "|---|---|---|---|---|"]
    md += ["| %s | %d | %.1f | %s | %s |" % (r["nom"], r["pages"], r["mo"], "" if r["fond_perdu_mm"] is None else "%.1f mm" % r["fond_perdu_mm"], r["titre"][:60]) for r in resultats]
    texte_md = "\n".join(md) + "\n"
    if a.md:
        open(creer_dossier(a.md), "w", encoding="utf-8").write(texte_md)
    if a.json:
        json.dump({"compte": cpt, "pdfs": resultats}, open(creer_dossier(a.json), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(texte_md if len(texte_md) < 6000 else texte_md[:6000] + "\n… (rapport complet : %s)" % (a.md or a.json or "--md"))
    return 1 if cpt["CRITIQUE"] or cpt["MAJEUR"] else 0


if __name__ == "__main__":
    sys.exit(main())
