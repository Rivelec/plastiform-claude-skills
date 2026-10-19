#!/usr/bin/env python3
"""projet.py — gestion d'un projet Affinity multilingue (BASE liée + un fichier par langue) : création du dossier,
validation de projet.json, conversion de l'ancien catalogue.json, versions, CHANGELOG, publication, état.

  creer     DOSSIER --type catalogue|fiches --nom "…" --prefixe BRO_RIV [--annee 2026] [--version 1.0]
            [--langues FR,EN,ES,DE] [--numeros FR:38,EN:39,ES:42,DE:43] [--variantes AP,SP] [--supports WEB,IMP]
            → dossiers Images/ Fonts/ Scripts/ EXPORTS/ _travail/, projet.json, CLAUDE.md, LISEZMOI.txt, CHANGELOG.md,
              tasks.md, copie des scripts de publication dans Scripts/. Les .af se créent ensuite dans Affinity
              (affinity/creer_document.js, puis placer_base.js) : voir le skill affinity-nouveau-projet.
  valider   DOSSIER            contrôle projet.json (structure, fichiers, cohérence exports/variantes/supports).
  convertir DOSSIER [--ecraser] crée projet.json à partir de l'ancien catalogue.json (laissé tel quel).
  version   DOSSIER [X.Y] [--forcer]   monte la version (défaut : +0.1) et ouvre la section du CHANGELOG ;
            refusé si la version courante n'est pas encore publiée (une seule montée par cycle non publié).
            Projet d'éléments (fiches, CHANGELOG en mode « éléments ») : --element "F20" (ou "F20,M25", ou --tous) ;
            chaque élément a SA version (dernière publiée +0.1), imprimée sur l'élément lui-même.
  noter     DOSSIER "texte" [--rubrique "Corrections"] [--element "F20"]   ajoute une ligne au CHANGELOG ; mode
            éléments : refusé si la dernière version de l'élément est publiée (monter d'abord sa version).
  publier   DOSSIER [--date JJ/MM/AAAA] [--element "F20" | --tous]   déclare publiée la version courante (sur
            décision de l'utilisateur UNIQUEMENT) : CHANGELOG (et projet.json en mode document).
  etat      DOSSIER            version, état, fichiers, exports périmés (plus anciens que les .af), dernier journal ;
            mode éléments : état de chaque élément.

Mode « éléments » (fiches techniques) : la version d'une fiche est IMPRIMÉE sur la fiche (pied de page « Version X.Y »)
dans chaque langue ; export_par_element.js la lit pour nommer le PDF. Après « version --element », mettre à jour ce
texte (corrections_textes.js, règle limitée aux pages de la fiche, dans chaque langue) puis réexporter.
"""
import argparse, datetime, glob, json, os, re, shutil, sys

ICI = os.path.dirname(os.path.abspath(__file__))
OUTILS = os.path.dirname(ICI)
MODELES = os.path.join(OUTILS, "modeles")
AUJ = datetime.date.today().strftime("%d/%m/%Y")


# ---------------------------------------------------------------- utilitaires
def lire_json(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def ecrire_json(p, o):
    with open(p, "w", encoding="utf-8") as f:
        json.dump(o, f, ensure_ascii=False, indent=1)
        f.write("\n")


def charger(dossier):
    """(données, chemin, format) ; format = 'projet' ou 'catalogue' (ancien)."""
    for nom, fmt in (("projet.json", "projet"), ("catalogue.json", "catalogue")):
        p = os.path.join(dossier, nom)
        if os.path.exists(p):
            return lire_json(p), p, fmt
    sys.exit("Ni projet.json ni catalogue.json dans " + dossier)


def version_de(d, fmt):
    return str(d["projet"]["version"] if fmt == "projet" else d["version"])


def poser_version(d, fmt, v):
    if fmt == "projet":
        d["projet"]["version"] = v
    else:
        d["version"] = v


def remplir(texte, valeurs):
    for k, v in valeurs.items():
        texte = texte.replace("{{%s}}" % k, str(v))
    return texte


def changelog(dossier):
    return os.path.join(dossier, "CHANGELOG.md")


def mode_changelog(d, fmt, texte):
    """« elements » (une version par élément : fiches) ou « document » (une version pour tout le projet)."""
    m = (d.get("changelog") or {}).get("mode") if fmt == "projet" else None
    if m:
        return m
    if fmt == "projet" and ((d.get("projet") or {}).get("type") == "fiches" or d.get("decoupage")):
        return "elements"
    return "elements" if re.search(r"^### (?:Non publiée|Publiée le)", texte, re.M) else "document"


def refuser_options_elements(a, mode):
    """--element / --tous n'ont de sens qu'en mode éléments : ailleurs, refus explicite (sinon tout le projet serait visé)."""
    if mode != "elements" and (getattr(a, "element", None) or getattr(a, "tous", False)):
        sys.exit("--element / --tous : seulement pour un projet d'éléments (fiches, CHANGELOG par élément). Ce projet a une "
                 "seule version pour tout le document : relancer sans --element / --tous.")


# ---------------------------------------------------------------- creer
def creer(a):
    D = os.path.abspath(a.dossier)
    if os.path.exists(os.path.join(D, "projet.json")):
        sys.exit("projet.json existe déjà dans " + D)
    langues = [x.strip().upper() for x in a.langues.split(",") if x.strip()]
    numeros = dict(x.split(":") for x in a.numeros.split(",")) if a.numeros else {}
    variantes = [x.strip() for x in a.variantes.split(",")] if a.variantes else ["AP", "SP"]
    supports = [x.strip() for x in a.supports.split(",")] if a.supports else ["WEB", "IMP"]
    os.makedirs(D, exist_ok=True)
    for sd in ("Images", "Fonts", "Scripts", "_travail", "PDF" if a.type == "fiches" else "EXPORTS"):
        os.makedirs(os.path.join(D, sd), exist_ok=True)
    pf = a.prefixe_fichiers or (a.prefixe if a.type == "fiches" else "")
    fich = {L: ((pf + "_") if pf else "") + L + ".af" for L in langues}
    base = ((pf + "_") if pf else "") + "BASE.af"
    titres = {L: "%s %s" % (a.nom, a.annee) for L in langues}
    exports = [{"langue": L, "variante": v, "numero": int(numeros[L]) if L in numeros and numeros[L].isdigit() else numeros.get(L, 0), "supports": supports}
               for L in langues for v in variantes]
    modele = os.path.join(MODELES, "projet.%s.json" % ("fiches" if a.type == "fiches" else "catalogue"))
    t = open(modele, encoding="utf-8").read()
    t = remplir(t, {"NOM": a.nom, "PREFIXE": a.prefixe, "ANNEE": a.annee, "VERSION": a.version, "PREFIXE_FICHIERS": pf or a.prefixe,
                    "LANGUES_FICHIERS": json.dumps(fich, ensure_ascii=False), "TITRES": json.dumps(titres, ensure_ascii=False),
                    "EXPORTS": json.dumps(exports, ensure_ascii=False)})
    pj = json.loads(t)
    pj["fichiers"]["base"] = base
    if a.type != "fiches":
        pj["variantes"] = {k: v for k, v in pj["variantes"].items() if k in variantes} or {v: {"libelle": v, "afficher": [], "masquer": []} for v in variantes}
        pj["supports"] = {k: v for k, v in pj["supports"].items() if k in supports} or {s: {"libelle": s, "prereglages": ["PDF (numérique - haute qualité)"]} for s in supports}
        if not a.donnees:
            pj.pop("donnees", None)
    ecrire_json(os.path.join(D, "projet.json"), pj)
    vals = {"NOM": a.nom, "NOM_MAJ": a.nom.upper(), "PREFIXE": a.prefixe, "ANNEE": a.annee, "VERSION": a.version, "DATE": AUJ,
            "BASE": base, "FICHIERS_LANGUES": ", ".join(fich.values()), "LANGUES": ", ".join(langues), "LANGUE_REF": langues[0],
            "EXPORTS": "PDF/" if a.type == "fiches" else "EXPORTS/", "TYPE": a.type}
    vals["PARAMETRES"] = ("découpage en fiches : titre repère, référence et version imprimées, titres et noms des PDF"
                          if a.type == "fiches" else "version, références, variantes, supports, exports")
    if a.type == "fiches":
        vals["REGLE_VERSIONS"] = ("5. Versions : chaque fiche a la sienne, imprimée dans son pied de page (toutes les langues) et\n"
            "   inscrite dans sa section de `CHANGELOG.md` (`projet.py version --element`, puis pied de page corrigé par\n"
            "   `corrections_textes.js`) ; exports par script (`export_par_element.js`), jamais à la main. Tout changement :\n"
            "   une ligne dans la section de la fiche (`projet.py noter --element`) ; une seule montée par cycle non publié ;\n"
            "   la publication est déclarée par l'utilisateur uniquement (`projet.py publier --element`).")
        vals["REGLE_DONNEES"] = ("6. Données techniques : écrites une seule fois, dans la BASE (communes aux langues) ; source et date\n"
            "   notées dans le CHANGELOG.")
    else:
        vals["REGLE_VERSIONS"] = ("5. Versions et références : uniquement dans `projet.json` ; exports par script (`Scripts/` ou bibliothèque\n"
            "   Affinity), jamais à la main. Tout changement de contenu : une ligne dans `CHANGELOG.md` (`projet.py noter`) ;\n"
            "   une seule montée de version par cycle non publié ; la publication est déclarée par l'utilisateur uniquement\n"
            "   (`projet.py publier`).")
        vals["REGLE_DONNEES"] = ("6. Données communes (prix, valeurs techniques) : dans le fichier de données centralisé, reportées par\n"
            "   `appliquer_donnees.js`, jamais à la main dans un seul fichier.")
    for nom in ("CLAUDE.md", "LISEZMOI.txt", "CHANGELOG.md", "tasks.md"):
        cible = os.path.join(D, nom)
        src = os.path.join(MODELES, re.sub(r"\.(\w+)$", r".fiches.\1", nom)) if a.type == "fiches" else ""
        if not (src and os.path.exists(src)):
            src = os.path.join(MODELES, nom)
        if not os.path.exists(cible):
            open(cible, "w", encoding="utf-8").write(remplir(open(src, encoding="utf-8").read(), vals))
    scripts = ["export_par_element.js"] if a.type == "fiches" else ["export_publication.js"] + (["appliquer_donnees.js"] if a.donnees else [])
    for s in scripts:
        shutil.copy(os.path.join(OUTILS, "publication", s), os.path.join(D, "Scripts", s))
    print("Projet créé : " + D)
    print("  projet.json, CLAUDE.md, LISEZMOI.txt, CHANGELOG.md, tasks.md ; Scripts/" + ", Scripts/".join(scripts))
    print("Étapes suivantes (Affinity) : creer_document.js pour %s et pour %s ; Fichier > Insérer… la BASE (liée) une fois "
          "dans chaque fichier de langue, puis placer_base.js ; inventaire_liens.js pour contrôler." % (base, ", ".join(fich.values())))


# ---------------------------------------------------------------- valider
def valider(a):
    D = os.path.abspath(a.dossier)
    d, p, fmt = charger(D)
    err, avert = [], []
    if fmt == "catalogue":
        avert.append("ancien format catalogue.json : « projet.py convertir » pour passer à projet.json")
        d = convertir_dict(d)
    pj = d.get("projet", {})
    for k in ("prefixe", "annee", "version"):
        if not pj.get(k):
            err.append("projet.%s manquant" % k)
    if pj.get("version") and not re.fullmatch(r"\d+\.\d+", str(pj["version"])):
        err.append("projet.version « %s » : format attendu X.Y" % pj["version"])
    f = d.get("fichiers", {})
    langues = f.get("langues") or {}
    if not langues and not f.get("modele_langue"):
        err.append("fichiers.langues vide")
    for L, nom in langues.items():
        if not os.path.exists(os.path.join(D, nom)):
            avert.append("fichier de langue %s absent : %s" % (L, nom))
    if f.get("base") and not os.path.exists(os.path.join(D, f["base"])):
        avert.append("BASE absente : " + f["base"])
    if not os.path.isdir(os.path.join(D, f.get("images", "Images/"))):
        err.append("dossier d'images absent : " + f.get("images", "Images/"))
    els = d.get("elements", {})
    for v, dv in d.get("variantes", {}).items():
        for k in dv.get("afficher", []) + dv.get("masquer", []):
            if k not in els:
                err.append("variante %s : élément « %s » non défini dans elements" % (v, k))
    for e in d.get("exports", []):
        if e.get("variante") not in d.get("variantes", {}):
            err.append("export %s : variante « %s » inconnue" % (e.get("langue"), e.get("variante")))
        for s in e.get("supports", []):
            if s not in d.get("supports", {}):
                err.append("export %s %s : support « %s » inconnu" % (e.get("langue"), e.get("variante"), s))
        if langues and e.get("langue") not in langues:
            err.append("export : langue « %s » absente de fichiers.langues" % e.get("langue"))
    for s, ds in d.get("supports", {}).items():
        if not ds.get("prereglages"):
            err.append("support %s sans préréglage" % s)
    for k, rx in (("reference.motif", (d.get("reference") or {}).get("motif")),) + tuple(("decoupage." + k, v) for k, v in (d.get("decoupage") or {}).items() if k in ("debut", "reference", "produit", "version", "version_datee", "page_precedente") and v):
        if rx:
            try:
                re.compile(rx)
            except re.error as x:
                err.append("%s : expression invalide (%s)" % (k, x))
    connus = {"prefixe", "numero", "annee", "version", "langue", "variante", "support", "ref", "version_fichier", "produit"}
    for k in ("nom_fichier",):
        for ph in re.findall(r"\{(\w+)\}", d.get(k, "")):
            if ph not in connus:
                err.append("%s : {%s} inconnu" % (k, ph))
    if d.get("donnees") and not os.path.exists(os.path.join(D, d["donnees"].get("fichier", ""))):
        avert.append("fichier de données absent : " + d["donnees"].get("fichier", ""))
    if not os.path.exists(changelog(D)):
        avert.append("CHANGELOG.md absent")
    for m in err:
        print("ERREUR  " + m)
    for m in avert:
        print("ATTENTION " + m)
    print("projet.json valide" if not err else "%d erreur(s)" % len(err))
    return 1 if err else 0


# ---------------------------------------------------------------- convertir
def convertir_dict(c):
    variantes = {}
    for k, v in (c.get("variantes") or {}).items():
        variantes[k] = {"libelle": v.get("libelle", k),
                        "afficher": [x for x, b in (("PRIX", v.get("prix")), ("UNCETA", v.get("unceta"))) if b],
                        "masquer": [x for x, b in (("PRIX", v.get("prix")), ("UNCETA", v.get("unceta"))) if not b]}
    langues = []
    for e in c.get("exports", []):
        if e["langue"] not in langues:
            langues.append(e["langue"])
    return {
        "_aide": ["Converti depuis catalogue.json le %s (projet.py convertir)." % AUJ],
        "projet": {"nom": (c.get("titres") or {}).get("FR", c.get("prefixe")), "type": "catalogue", "prefixe": c["prefixe"],
                   "annee": str(c["annee"]), "version": str(c["version"]), "etat": "non publiée", "auteur": "Rivelec - Plastiform", "langue_reference": "FR"},
        "fichiers": {"base": "BASE.af", "langues": {L: L + ".af" for L in langues}, "images": "Images/", "exports": "EXPORTS/", "scripts": "Scripts/"},
        "titres": c.get("titres", {}),
        "reference": {"modele": "{prefixe}_{numero}_{annee}_V{version}", "motif": c["prefixe"] + "_\\d+_\\d{4}_V\\d+(?:\\.\\d+)*"},
        "elements": {"PRIX": {"calque": "PRIX"}, "UNCETA": {"motif": "unceta"}},
        "variantes": variantes, "supports": c.get("supports", {}), "exports": c.get("exports", []),
        "nom_fichier": "{support}_{langue}_{variante}_{ref}.pdf",
        "changelog": {"mode": "document"},
    }


def convertir(a):
    D = os.path.abspath(a.dossier)
    src = os.path.join(D, "catalogue.json")
    if not os.path.exists(src):
        sys.exit("pas de catalogue.json dans " + D)
    cible = os.path.join(D, "projet.json")
    if os.path.exists(cible) and not a.ecraser:
        sys.exit("projet.json existe déjà (--ecraser pour le remplacer)")
    pj = convertir_dict(lire_json(src))
    if os.path.exists(os.path.join(D, "tarifs.json")):
        pj["donnees"] = {"fichier": "tarifs.json", "calque": "PRIX", "garde": "€", "tolerance": 8}
    ecrire_json(cible, pj)
    print("projet.json créé (catalogue.json conservé ; export_publication.js lit projet.json en priorité).")


# ---------------------------------------------------------------- version / noter / publier
def entete_courant(texte):
    """Première section « ## V… » du CHANGELOG (mode document) : (index ligne, ligne) ou (None, None)."""
    lignes = texte.split("\n")
    for i, l in enumerate(lignes):
        if re.match(r"^## V\d", l):
            return i, l
    return None, None


# ---- mode « éléments » : une section « ## <élément> – … » par élément, sous-sections « ### Non publiée – Version X.Y »
# ---- puis « ### Publiée le JJ/MM/AAAA – Version X.Y » ; la plus récente est la première sous le titre de l'élément.
RE_COMMUNS = re.compile(r"^## Changements communs")


def titre_element(nom):
    return re.compile(r"^## " + re.escape(nom) + r"(?:\s+[–-]|\s*$)")


def elements_du_changelog(lignes):
    """Noms des éléments (« F20 » pour « ## F20 – TEC_FTE_RIV_001 »), dans l'ordre du fichier."""
    out = []
    for l in lignes:
        if l.startswith("## ") and not RE_COMMUNS.match(l):
            out.append(re.split(r"\s+[–-]\s+", l[3:].strip(), maxsplit=1)[0].strip())
    return out


def cible_elements(a, lignes):
    if getattr(a, "tous", False):
        return elements_du_changelog(lignes)
    if a.element:
        return [x.strip() for x in a.element.split(",") if x.strip()]
    return []


def etat_element(lignes, nom):
    """(index du titre, fin de section, état, version, date) ; état = None si l'élément n'a pas de section."""
    i = next((k for k, l in enumerate(lignes) if titre_element(nom).match(l)), None)
    if i is None:
        return None, None, None, None, None
    fin = next((k for k in range(i + 1, len(lignes)) if re.match(r"^#{1,2} ", lignes[k])), len(lignes))
    for k in range(i + 1, fin):
        m = re.match(r"^### Non publiée(?:\s+[–-]\s+Version\s+(\S+))?", lignes[k])
        if m:
            return i, fin, "non publiée", m.group(1), None
        m = re.match(r"^### Publiée le (\S+)(?:\s+[–-]\s+Version\s+(\S+))?", lignes[k])
        if m:
            return i, fin, "publiée", m.group(2), m.group(1)
    return i, fin, "vide", None, None


def plus_un(v):
    maj, mi = (int(x) for x in str(v).split(".")[:2])
    return "%d.%d" % (maj, mi + 1)


def version_elements(a, d, fmt, texte, cl):
    lignes = texte.rstrip("\n").split("\n")
    noms = cible_elements(a, lignes)
    if not noms:
        sys.exit("CHANGELOG en mode « éléments » : chaque élément a sa propre version. Préciser --element \"F20\" "
                 "(plusieurs : \"F20,M25\") ou --tous.")
    if a.nouvelle and not re.fullmatch(r"\d+\.\d+", a.nouvelle):
        sys.exit("version attendue au format X.Y")
    faits, refus = [], []
    for nom in noms:
        i, fin, et, v0, date = etat_element(lignes, nom)
        if et == "non publiée":
            if not a.forcer:
                refus.append("%s (version %s pas encore publiée)" % (nom, v0 or "?")); continue
            # --forcer (demande explicite) : la section en cours change de numéro, pas de 2e section « Non publiée »
            v1 = a.nouvelle or (plus_un(v0) if v0 and re.fullmatch(r"\d+\.\d+", v0) else version_de(d, fmt))
            k = next(k for k in range(i + 1, fin) if lignes[k].startswith("### Non publiée"))
            lignes[k] = "### Non publiée – Version " + v1
            faits.append("%s : %s → %s (cycle en cours renuméroté)" % (nom, v0 or "—", v1)); continue
        if i is None:
            v1 = a.nouvelle or version_de(d, fmt)
            lignes += ["", "## " + nom, "", "### Non publiée – Version " + v1, ""]
        else:
            v1 = a.nouvelle or (plus_un(v0) if v0 and re.fullmatch(r"\d+\.\d+", v0) else version_de(d, fmt))
            bloc = ["", "### Non publiée – Version " + v1]
            if v0:
                bloc += ["", "Version précédente : %s%s." % (v0, " (publiée le %s)" % date if date else "")]
            lignes[i + 1:i + 1] = bloc
        faits.append("%s : %s → %s" % (nom, v0 or "—", v1))
    open(cl, "w", encoding="utf-8").write("\n".join(lignes) + "\n")
    for f in faits:
        print("Version " + f)
    if refus:
        print("Inchangé (une seule montée par cycle non publié ; --forcer sur demande explicite) : " + "; ".join(refus))
    if faits:
        print("Ensuite : mettre à jour la version IMPRIMÉE sur chaque fiche concernée, dans chaque langue (pied de page "
              "« Version X.Y » / « Versión X.Y ») avec corrections_textes.js (règle limitée aux pages de la fiche, "
              "simulation puis application), puis réexporter (export_par_element.js), qui nomme les PDF d'après ce texte.")
    return 1 if refus and not faits else 0


def version(a):
    D = os.path.abspath(a.dossier)
    d, p, fmt = charger(D)
    cl0 = changelog(D)
    texte0 = open(cl0, encoding="utf-8").read() if os.path.exists(cl0) else "# Historique\n"
    if mode_changelog(d, fmt, texte0) == "elements":
        return version_elements(a, d, fmt, texte0, cl0)
    refuser_options_elements(a, "document")
    v0 = version_de(d, fmt)
    etat = (d.get("projet") or {}).get("etat", "non publiée") if fmt == "projet" else None
    cl = changelog(D)
    texte = open(cl, encoding="utf-8").read() if os.path.exists(cl) else "# Historique\n"
    mode = mode_changelog(d, fmt, texte)
    _, ent = entete_courant(texte)
    non_pub = (etat == "non publiée") if etat else bool(ent and "non publiée" in ent and ent.startswith("## V" + v0))
    if mode == "elements":
        non_pub = non_pub or bool(re.search(r"^### Non publiée – Version " + re.escape(v0), texte, re.M))
    if non_pub and not a.forcer:
        sys.exit("La version %s n'est pas encore publiée : une seule montée de version par cycle non publié. "
                 "Noter les changements dans la section en cours (projet.py noter), ou --forcer sur demande explicite." % v0)
    if a.nouvelle:
        v1 = a.nouvelle
    else:
        maj, mi = (int(x) for x in v0.split(".")[:2])
        v1 = "%d.%d" % (maj, mi + 1)
    if not re.fullmatch(r"\d+\.\d+", v1):
        sys.exit("version attendue au format X.Y")
    poser_version(d, fmt, v1)
    if fmt == "projet":
        d["projet"]["etat"] = "non publiée"
        d["projet"].pop("publiee_le", None)
    ecrire_json(p, d)
    if mode == "document":
        lignes = texte.split("\n")
        i, ent0 = entete_courant(texte)
        if i is not None and "non publiée" in ent0:
            # --forcer sur un cycle encore ouvert : la section en cours est renumérotée (pas de 2e section non publiée)
            lignes[i] = re.sub(r"^## V[\d.]+", "## V" + v1, ent0)
        else:
            bloc = ["## V%s — cycle ouvert le %s (non publiée)" % (v1, AUJ), ""]
            if i is None:
                lignes += [""] + bloc
            else:
                lignes[i:i] = bloc
        open(cl, "w", encoding="utf-8").write("\n".join(lignes))
    print("Version %s → %s (%s) ; section ouverte dans CHANGELOG.md%s" % (v0, v1, os.path.basename(p),
          "" if mode == "document" else " : en mode « éléments », ouvrir la section de chaque élément modifié avec noter --element"))
    print("Ensuite : relancer l'export (la référence imprimée et les noms de fichiers prennent la nouvelle version).")


def noter(a):
    D = os.path.abspath(a.dossier)
    d, p, fmt = charger(D)
    cl = changelog(D)
    if not os.path.exists(cl):
        open(cl, "w", encoding="utf-8").write("# Historique\n")
    texte = open(cl, encoding="utf-8").read()
    mode = mode_changelog(d, fmt, texte)
    refuser_options_elements(a, mode)
    lignes = texte.rstrip("\n").split("\n")
    ligne = "- " + a.texte.strip()
    if mode == "elements" and a.element and a.rubrique:   # section d'élément : la rubrique devient un préfixe
        ligne = "- %s : %s" % (a.rubrique, a.texte.strip())

    def fin_section(debut, niveau):
        j = debut + 1
        while j < len(lignes) and not re.match(r"^#{1,%d} " % niveau, lignes[j]):
            j += 1
        while j > debut + 1 and not lignes[j - 1].strip():
            j -= 1
        return j

    if mode == "elements" and a.element:
        v = version_de(d, fmt)
        i, _, et, v0, date = etat_element(lignes, a.element)
        if et == "publiée":
            sys.exit("%s : la version %s est publiée (le %s) : ouvrir d'abord un nouveau cycle — projet.py version <dossier> "
                     "--element \"%s\" — puis noter." % (a.element, v0 or "?", date or "?", a.element))
        if i is None:
            lignes += ["", "## " + a.element, "", "### Non publiée – Version " + v, "", ligne]
        else:
            fin = fin_section(i, 2)
            j = next((k for k in range(i + 1, fin) if lignes[k].startswith("### Non publiée")), None)
            if j is None:
                lignes[i + 1:i + 1] = ["", "### Non publiée – Version " + v, "", ligne]
            else:
                lignes.insert(fin_section(j, 3), ligne)
    else:
        if mode == "elements":
            i = next((k for k, l in enumerate(lignes) if l.startswith("## Changements communs")), None)
            if i is None:
                lignes += ["", "## Changements communs – cycle ouvert le " + AUJ, ""]
                i = len(lignes) - 2
        else:
            i, _ = entete_courant("\n".join(lignes))
            if i is None:
                v = version_de(d, fmt)
                lignes += ["", "## V%s — cycle ouvert le %s (non publiée)" % (v, AUJ), ""]
                i = len(lignes) - 2
            elif "non publiée" not in lignes[i]:
                sys.exit("La section en tête du CHANGELOG est publiée : monter d'abord la version (projet.py version).")
        if a.rubrique:
            fin = fin_section(i, 2)
            j = next((k for k in range(i + 1, fin) if lignes[k].strip() == "### " + a.rubrique), None)
            if j is None:
                lignes[fin:fin] = ["", "### " + a.rubrique, ligne]
            else:
                lignes.insert(fin_section(j, 3), ligne)
        else:
            k = fin_section(i, 2)
            lignes[k:k] = ["", ligne] if k == i + 1 else [ligne]   # ligne vide sous le titre d'une section vide
    open(cl, "w", encoding="utf-8").write("\n".join(lignes) + "\n")
    print("Noté dans CHANGELOG.md : " + ligne)


def publier(a):
    D = os.path.abspath(a.dossier)
    d, p, fmt = charger(D)
    date = a.date or AUJ
    cl = changelog(D)
    texte = open(cl, encoding="utf-8").read()
    mode = mode_changelog(d, fmt, texte)
    refuser_options_elements(a, mode)
    if mode == "elements":
        lignes = texte.split("\n")
        noms = cible_elements(a, lignes)
        if not noms:
            sys.exit("mode éléments : préciser --element (ex. « F20 », ou « F20,M25 ») ou --tous ; seul l'utilisateur "
                     "déclare une publication")
        manque = []
        for nom in noms:
            i = next((k for k, l in enumerate(lignes) if titre_element(nom).match(l)), None)
            j = None if i is None else next((k for k in range(i + 1, len(lignes)) if lignes[k].startswith("### Non publiée") or re.match(r"^#{1,2} ", lignes[k])), None)
            if j is None or not lignes[j].startswith("### Non publiée"):
                manque.append(nom); continue
            lignes[j] = lignes[j].replace("### Non publiée", "### Publiée le " + date)
            print("%s : %s" % (nom, lignes[j][4:]))
        open(cl, "w", encoding="utf-8").write("\n".join(lignes))
        if manque:
            print("Sans section « Non publiée » (rien à publier) : " + ", ".join(manque))
        return 1 if len(manque) == len(noms) else 0
    i, ent = entete_courant(texte)
    if i is None or "non publiée" not in ent:
        sys.exit("aucune section « non publiée » en tête du CHANGELOG")
    lignes = texte.split("\n")
    lignes[i] = ent.replace("(non publiée)", "(publiée le %s)" % date)
    open(cl, "w", encoding="utf-8").write("\n".join(lignes))
    if fmt == "projet":
        d["projet"]["etat"] = "publiée"
        d["projet"]["publiee_le"] = date
        ecrire_json(p, d)
    print("Version %s déclarée publiée le %s." % (version_de(d, fmt), date))


# ---------------------------------------------------------------- etat
def etat(a):
    D = os.path.abspath(a.dossier)
    d, p, fmt = charger(D)
    v = version_de(d, fmt)
    print("Projet : %s (%s)" % (D, os.path.basename(p)))
    cl = changelog(D)
    t_cl = open(cl, encoding="utf-8").read() if os.path.exists(cl) else ""
    elements = mode_changelog(d, fmt, t_cl) == "elements"
    if elements:
        print("Versions : une par élément, imprimée sur l'élément (état ci-dessous) ; projet.version %s = version initiale des nouveaux éléments" % v)
    else:
        print("Version : %s — %s" % (v, (d.get("projet") or {}).get("etat", "?") if fmt == "projet" else "voir CHANGELOG"))
    afs = sorted(glob.glob(os.path.join(D, "*.af")) + glob.glob(os.path.join(D, "*.afpackage")))
    dernier_af = max((os.path.getmtime(x) for x in afs), default=0)
    for x in afs:
        print("  %-40s %7.1f Mo  modifié %s" % (os.path.basename(x), os.path.getsize(x) / 1048576, datetime.datetime.fromtimestamp(os.path.getmtime(x)).strftime("%d/%m %H:%M")))
        if os.path.exists(x + "~lock~"):
            print("    ATTENTION : verrou %s~lock~ (document ouvert, ou Affinity fermé brutalement)" % os.path.basename(x))
    exp = os.path.join(D, (d.get("fichiers") or {}).get("exports", "EXPORTS/") if fmt == "projet" else "EXPORTS/")
    pdfs = sorted(glob.glob(os.path.join(exp, "**", "*.pdf"), recursive=True))
    if pdfs:
        anciens = [x for x in pdfs if os.path.getmtime(x) < dernier_af]
        print("Exports : %d PDF dans %s ; %d plus ancien(s) que le dernier .af modifié%s" % (len(pdfs), os.path.relpath(exp, D), len(anciens), " → réexporter" if anciens else ""))
        hors_v = [] if elements else [os.path.basename(x) for x in pdfs if "_V" in os.path.basename(x) and "_V" + v not in os.path.basename(x) and "_V" + v.replace(".", "-") not in os.path.basename(x)]
        if hors_v:   # (mode éléments : chaque fiche a sa version, pas de comparaison avec projet.version)
            print("  %d PDF d'une autre version (ex. %s)" % (len(hors_v), hors_v[0]))
    else:
        print("Exports : aucun PDF")
    for j in ("export_log.txt", "donnees_log.txt", "tarifs_log.txt"):
        cands = [x for x in [os.path.join(exp, j)] + glob.glob(os.path.join(exp, "**", j), recursive=True) if os.path.exists(x)]
        pj = max(cands, key=os.path.getmtime) if cands else None   # ex. PDF/Fiches/export_log.txt pour les fiches
        if pj:
            der = [l for l in open(pj, encoding="utf-8", errors="replace").read().splitlines() if l.strip()]
            print("  %s (%s) : %s" % (j, datetime.datetime.fromtimestamp(os.path.getmtime(pj)).strftime("%d/%m %H:%M"), der[-1] if der else ""))
    cl = changelog(D)
    if os.path.exists(cl):
        t = open(cl, encoding="utf-8").read()
        i, ent = entete_courant(t)
        if mode_changelog(d, fmt, t) == "elements":
            lignes = t.split("\n"); noms = elements_du_changelog(lignes)
            print("CHANGELOG (mode éléments) : %d élément(s), %d section(s) « Non publiée »" % (len(noms), len(re.findall(r"^### Non publiée", t, re.M))))
            for nom in noms[:60]:
                _, _, et, v0, date = etat_element(lignes, nom)
                print("  %-22s %s%s%s" % (nom, et or "?", " – Version " + v0 if v0 else "", " le " + date if date else ""))
        else:
            print("CHANGELOG : " + (ent or "(aucune section « ## V… »)"))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sp = ap.add_subparsers(dest="cmd", required=True)
    c = sp.add_parser("creer"); c.add_argument("dossier"); c.add_argument("--type", choices=["catalogue", "fiches"], default="catalogue")
    c.add_argument("--nom", required=True); c.add_argument("--prefixe", required=True); c.add_argument("--annee", default=str(datetime.date.today().year))
    c.add_argument("--version", default="1.0"); c.add_argument("--langues", default="FR,EN"); c.add_argument("--numeros")
    c.add_argument("--variantes"); c.add_argument("--supports"); c.add_argument("--prefixe-fichiers"); c.add_argument("--donnees", action="store_true")
    c.set_defaults(f=creer)
    c = sp.add_parser("valider"); c.add_argument("dossier"); c.set_defaults(f=valider)
    c = sp.add_parser("convertir"); c.add_argument("dossier"); c.add_argument("--ecraser", action="store_true"); c.set_defaults(f=convertir)
    c = sp.add_parser("version"); c.add_argument("dossier"); c.add_argument("nouvelle", nargs="?"); c.add_argument("--forcer", action="store_true")
    c.add_argument("--element", help="mode éléments : élément(s), séparés par des virgules"); c.add_argument("--tous", action="store_true", help="mode éléments : tous les éléments du CHANGELOG"); c.set_defaults(f=version)
    c = sp.add_parser("noter"); c.add_argument("dossier"); c.add_argument("texte"); c.add_argument("--rubrique"); c.add_argument("--element"); c.set_defaults(f=noter)
    c = sp.add_parser("publier"); c.add_argument("dossier"); c.add_argument("--date"); c.add_argument("--element"); c.add_argument("--tous", action="store_true"); c.set_defaults(f=publier)
    c = sp.add_parser("etat"); c.add_argument("dossier"); c.set_defaults(f=etat)
    a = ap.parse_args()
    r = a.f(a)
    sys.exit(r or 0)


if __name__ == "__main__":
    main()
