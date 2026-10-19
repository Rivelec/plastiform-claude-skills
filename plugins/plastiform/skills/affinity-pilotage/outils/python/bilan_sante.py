#!/usr/bin/env python3
"""bilan_sante.py — bilan de santé d'un projet Affinity, à partir des inventaires produits dans Affinity
(inventaire_liens.js, inventaire_polices.js, inventaire_structure.js, textes_debordants.js) et du dossier lui-même.

Usage : python3 bilan_sante.py DOSSIER_PROJET [--run DOSSIER_RUN] [--ppp-min 250] [--ppp-max 450] [--md SORTIE.md]
  --run : dossier où se trouvent les JSON d'inventaire (défaut : _Outils_Affinity/run/).
Chaque constat a une gravité (CRITIQUE / MAJEUR / MINEUR) et l'action ou l'outil qui le règle.
"""
import argparse, datetime, glob, json, os, subprocess, sys

def creer_dossier(p):
    """Crée le dossier d'un fichier de sortie s'il n'existe pas (ex. « revue/rapport.md »), renvoie le chemin."""
    d = os.path.dirname(os.path.abspath(p))
    os.makedirs(d, exist_ok=True)
    return p


ICI = os.path.dirname(os.path.abspath(__file__))
RUN = os.path.join(os.path.dirname(ICI), "run")


def chemins_env():
    """RACINE_MAC / RACINE_VM de config/chemins.env (conversion des chemins Mac des inventaires)."""
    env = {}
    try:
        for l in open(os.path.join(os.path.dirname(ICI), "config", "chemins.env"), encoding="utf-8"):
            if "=" in l and not l.lstrip().startswith("#"):
                k, v = l.strip().split("=", 1)
                env[k] = os.path.expandvars(v.strip('"').replace("$RACINE_MAC", env.get("RACINE_MAC", "")))
    except OSError:
        pass
    return env.get("RACINE_MAC", ""), env.get("RACINE_VM", "")


RMAC, RVM = chemins_env()


def dans_projet(chemin_doc, D):
    p = chemin_doc
    if RMAC and p.startswith(RMAC):
        p = RVM + p[len(RMAC):]
    return os.path.abspath(p).startswith(D + os.sep)


def charge(p):
    try:
        return json.load(open(p, encoding="utf-8"))
    except Exception:
        return None


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("dossier"); ap.add_argument("--run", default=RUN)
    ap.add_argument("--ppp-min", type=float, default=250); ap.add_argument("--ppp-max", type=float, default=450)
    ap.add_argument("--md")
    a = ap.parse_args()
    D = os.path.abspath(a.dossier)
    C = []   # (gravité, domaine, constat, action)
    add = lambda g, d, c, x: C.append((g, d, c, x))
    # 1. fichiers
    afs = sorted(glob.glob(os.path.join(D, "*.af")) + glob.glob(os.path.join(D, "*.afpackage")))
    if not afs:
        add("CRITIQUE", "Fichiers", "aucun document .af dans le dossier", "vérifier le chemin")
    for x in afs:
        if os.path.exists(x + "~lock~"):
            add("MINEUR", "Fichiers", "verrou %s~lock~" % os.path.basename(x), "fermer le document dans Affinity ; si Affinity est fermé, supprimer le verrou")
        mo = os.path.getsize(x) / 1048576
        if mo > 60:
            add("MINEUR", "Fichiers", "%s pèse %.0f Mo" % (os.path.basename(x), mo), "chercher images incorporées / calques pixel ; compacter.js")
    if not os.path.isdir(os.path.join(D, "Images")):
        add("MAJEUR", "Fichiers", "pas de dossier Images/", "créer Images/ et y regrouper les fichiers liés")
    pj = os.path.join(D, "projet.json")
    if os.path.exists(pj) or os.path.exists(os.path.join(D, "catalogue.json")):
        r = subprocess.run([sys.executable, os.path.join(ICI, "projet.py"), "valider", D], capture_output=True, text=True)
        for l in r.stdout.splitlines():
            if l.startswith("ERREUR"):
                add("MAJEUR", "Projet", l[8:].strip(), "corriger projet.json")
            elif l.startswith("ATTENTION"):
                add("MINEUR", "Projet", l[10:].strip(), "voir projet.py valider")
    else:
        add("MAJEUR", "Projet", "ni projet.json ni catalogue.json", "projet.py creer (nouveau) ou rédiger projet.json")
    for nom in ("CLAUDE.md", "LISEZMOI.txt", "CHANGELOG.md"):
        if not os.path.exists(os.path.join(D, nom)):
            add("MINEUR", "Documentation", nom + " absent", "modeles/" + nom)
    # 2. liens
    inv = charge(os.path.join(a.run, "inventaire_liens.json"))
    if inv:
        for doc in [x for x in inv.get("docs", []) if dans_projet(x["doc"], D)]:
            n = os.path.basename(doc["doc"]); c = doc["comptes"]
            if c.get("incorpore"):
                add("MAJEUR", "Images", "%s : %d image(s) incorporée(s)" % (n, c["incorpore"]), "extraire_ressources.js puis Gestionnaire de ressources > Remplacer (lié)")
            if c.get("manquant"):
                add("CRITIQUE", "Images", "%s : %d lien(s) introuvable(s)" % (n, c["manquant"]), "Gestionnaire de ressources > Rechercher ; ou remettre le fichier dans Images/")
            if c.get("raster"):
                add("MAJEUR", "Images", "%s : %d calque(s) pixel" % (n, c["raster"]), "extraire_pixels.js + pixels_vers_fichiers.py, puis placer lié")
        f = [x for x in inv.get("fichiers", {}).values() if x.get("ppi_min") and any(dans_projet(d, D) for d in x.get("docs", []))]
        bas = sorted((x for x in f if x["ppi_min"] < a.ppp_min), key=lambda x: x["ppi_min"])
        hauts = [x for x in f if x["ppi_min"] > a.ppp_max]
        if bas:
            add("MAJEUR", "Images", "%d image(s) sous %d ppp effectifs : %s" % (len(bas), a.ppp_min, ", ".join("%s (%d)" % (x["fichier"], x["ppi_min"]) for x in bas[:8])), "trouver une source plus grande ou réduire l'image dans la page")
        if hauts:
            gain = sum(max(0, x.get("octets") or 0) for x in hauts) / 1048576
            add("MINEUR", "Images", "%d image(s) au-delà de %d ppp effectifs (%.0f Mo de fichiers)" % (len(hauts), a.ppp_max, gain), "optimiser_images.py --cible 300")
    else:
        add("MINEUR", "Images", "inventaire_liens.json absent de %s" % a.run, "lancer affinity/inventaire_liens.js")
    # 3. polices
    pol = charge(os.path.join(a.run, "inventaire_polices.json"))
    if pol:
        for doc in [x for x in pol.get("docs", []) if dans_projet(x["doc"], D)]:
            abs_ = [k for k, e in doc.get("polices", {}).items() if e.get("absente")]
            if abs_:
                add("CRITIQUE", "Polices", "%s : police(s) absente(s) %s" % (os.path.basename(doc["doc"]), ", ".join(abs_)), "installer la police (Fonts/) ou remplacer_polices.js")
    # 4. structure
    st = charge(os.path.join(a.run, "structure.json"))
    if st:
        for doc in [x for x in st if dans_projet(x["doc"], D)]:
            n = os.path.basename(doc["doc"])
            sans = [p["si"] for p in doc.get("planches", []) if not p.get("liens")]
            avec = [p["si"] for p in doc.get("planches", []) if p.get("liens")]
            if avec and sans:
                add("MAJEUR", "Structure", "%s : planches sans BASE liée : %s" % (n, ",".join(map(str, sans[:20]))), "placer_base.js")
            inst = sum(1 for p in doc.get("planches", []) for c in p.get("calques", []) if c.get("type") == "PhysicalNode")
            if doc.get("maquettes") and not inst:
                add("MINEUR", "Structure", "%s : %d maquette(s), aucune instance sur les pages" % (n, len(doc["maquettes"])), "supprimer les maquettes inutilisées (panneau Pages)")
    for f in sorted(glob.glob(os.path.join(a.run, "textes_debordants*.json"))):
        deb = charge(f)
        if not (deb and dans_projet(deb.get("doc", ""), D) and deb.get("debordants")):
            continue
        L = deb["debordants"]; pages = sorted({e.get("page") for e in L})
        ex = "; ".join("p.%s « %s »" % (e.get("page"), e.get("debut", "")[:40]) for e in L[:5])
        add("MAJEUR", "Textes", "%s : %d cadre(s) dont le texte déborde (texte caché), pages %s — ex. %s" % (os.path.basename(deb["doc"]), len(L), ", ".join(map(str, pages[:30])) + ("…" if len(pages) > 30 else ""), ex),
            "agrandir le cadre ou raccourcir le texte (détail : %s)" % os.path.basename(f))
    # 5. exports
    exp = os.path.join(D, "EXPORTS")
    if os.path.isdir(exp) and afs:
        der = max(os.path.getmtime(x) for x in afs)
        pdfs = glob.glob(os.path.join(exp, "*.pdf"))
        vieux = [x for x in pdfs if os.path.getmtime(x) < der]
        if vieux:
            add("MINEUR", "Exports", "%d PDF plus ancien(s) que la dernière modification des .af" % len(vieux), "relancer l'export")
    # rapport
    ordre = {"CRITIQUE": 0, "MAJEUR": 1, "MINEUR": 2}
    C.sort(key=lambda x: (ordre[x[0]], x[1]))
    cpt = {g: sum(1 for c in C if c[0] == g) for g in ordre}
    md = ["# Bilan de santé — %s" % os.path.basename(D), "", "Le %s — %d CRITIQUE, %d MAJEUR, %d MINEUR" % (datetime.datetime.now().strftime("%d/%m/%Y %H:%M"), cpt["CRITIQUE"], cpt["MAJEUR"], cpt["MINEUR"]), "",
          "| Gravité | Domaine | Constat | Action |", "|---|---|---|---|"]
    md += ["| %s | %s | %s | %s |" % c for c in C] or ["| — | — | rien à signaler | — |"]
    texte = "\n".join(md) + "\n"
    if a.md:
        open(creer_dossier(a.md), "w", encoding="utf-8").write(texte)
    print(texte)
    return 1 if cpt["CRITIQUE"] else 0


if __name__ == "__main__":
    sys.exit(main())
