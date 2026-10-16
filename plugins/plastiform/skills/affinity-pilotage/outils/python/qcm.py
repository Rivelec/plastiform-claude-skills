#!/usr/bin/env python3
"""qcm.py — pages de décision (QCM) pour faire trancher une relecture par l'utilisateur, puis conversion des réponses
en règles de correction applicables par affinity/corrections_textes.js.

1) Générer la page :
   python3 qcm.py generer QUESTIONS.json SORTIE.html
   QUESTIONS.json = { "config": { "cle": "relecture-EN-2026-10", "surtitre": "Fiches techniques · anglais",
       "titre": "Relecture de l'anglais : points à trancher", "intro": "…", "destinataire": "Prénom",
       "nom_fichier": "Reponses_relecture_EN", "libelle_refs": "Lexique validé", "libelle_ctx": "Dans les fiches",
       "titre_valides": "…", "colonnes_valides": ["FR", "EN retenu", "Source", "Effet"] },
     "questions": [ { "id": "EN-001", "gravite": "CRITIQUE"|"MAJEUR"|"MINEUR" (ou "prio": 1|2|3), "theme": "Sécurité",
       "titre": "…", "ou": "p. 12 (F20), 23 occurrences", "quoi": "…", "pourquoi": "…", "refs": ["…"],
       "actuel": "texte actuel", "options": ["proposition 1", "proposition 2"], "recommande": 1 (0 = garder l'actuel),
       "contextes": [{ "etiquette": "FR", "page": 12, "element": "F20", "texte": "… ⟦passage⟧ …", "cible": false }],
       "regle": { "f": "texte actuel", "s": 5, "exact": 1 } (facultatif : pour la conversion en règles) } ],
     "valides": [ ["Groupe", [["a", "b", "c", "d"], …]] ] (facultatif : points déjà réglés, affichés en bas) }
   Les pages se publient en artefact (lien privé) ou s'envoient en fichier. Réponses gardées dans le navigateur ;
   l'utilisateur télécharge ou copie ses réponses (texte lisible + bloc JSON « Données pour Claude »).

2) Convertir les réponses :
   python3 qcm.py regles QUESTIONS.json REPONSES.txt SORTIE_regles.json
   Pour chaque question tranchée qui a une "regle" et dont la valeur choisie diffère de "actuel" :
   { ...regle, "r": valeur choisie, "note": "QCM <id>" } → à passer à corrections_textes.js (simulation d'abord).
"""
import json, os, re, sys

def creer_dossier(p):
    """Crée le dossier d'un fichier de sortie s'il n'existe pas (ex. « revue/rapport.md »), renvoie le chemin."""
    d = os.path.dirname(os.path.abspath(p))
    os.makedirs(d, exist_ok=True)
    return p


ICI = os.path.dirname(os.path.abspath(__file__))
MODELE = os.path.join(ICI, "..", "modeles", "qcm.html")
PRIO = {"CRITIQUE": 1, "MAJEUR": 2, "MAJEURE": 2, "MINEUR": 3, "MINEURE": 3}


def generer(src, sortie):
    d = json.load(open(src, encoding="utf-8"))
    cfg = d.get("config", {})
    items = []
    for q in d["questions"]:
        it = dict(q)
        it["prio"] = q.get("prio") or PRIO.get(str(q.get("gravite", "")).upper(), 3)
        it.setdefault("options", []); it.setdefault("contextes", []); it.setdefault("refs", [])
        items.append(it)
    ids = [i["id"] for i in items]
    if len(ids) != len(set(ids)):
        sys.exit("identifiants de questions en double")
    html = open(MODELE, encoding="utf-8").read()
    dump = lambda o: json.dumps(o, ensure_ascii=False).replace("</", "<\\/")
    html = html.replace("__TITRE_PAGE__", (cfg.get("titre") or "Décisions").replace("<", "&lt;"))
    html = html.replace("/*__CONFIG__*/", dump(cfg)).replace("/*__ITEMS__*/", dump(items)).replace("/*__COVERED__*/", dump(d.get("valides", [])))
    open(creer_dossier(sortie), "w", encoding="utf-8").write(html)
    n = {p: sum(1 for i in items if i["prio"] == p) for p in (1, 2, 3)}
    print("%s : %d question(s) — %d critique(s), %d majeure(s), %d mineure(s)" % (sortie, len(items), n[1], n[2], n[3]))


def lire_reponses(chemin):
    t = open(chemin, encoding="utf-8").read()
    m = re.search(r"--- Données pour Claude \(ne pas modifier\) ---\s*(\{.*\})\s*$", t, re.S)
    if not m:
        sys.exit("bloc « Données pour Claude » introuvable dans " + chemin)
    j = json.loads(m.group(1))
    if "decisions" in j:
        return j["decisions"], j
    dec = {}   # ancien format v1 : { answers: { id: { choice, text, note } } }
    for k, a in j.get("answers", {}).items():
        dec[k] = {"choix": a.get("choice"), "valeur": a.get("text"), "note": a.get("note", "")}
    return dec, j


def regles(src, rep, sortie):
    d = json.load(open(src, encoding="utf-8"))
    dec, meta = lire_reponses(rep)
    res, sans, garde, non = [], [], 0, 0
    for q in d["questions"]:
        a = dec.get(q["id"])
        if not a or not a.get("choix"):
            non += 1; continue
        v = a.get("valeur")
        if v is None and a["choix"].startswith("p"):
            v = q["options"][int(a["choix"][1:]) - 1]
        elif v is None and a["choix"] == "keep":
            v = q.get("actuel")
        if a["choix"] == "keep" or v == q.get("actuel"):
            garde += 1; continue
        if not q.get("regle"):
            sans.append(q["id"]); continue
        r = dict(q["regle"]); r["r"] = v; r["note"] = "QCM %s%s" % (q["id"], (" — " + a["note"]) if a.get("note") else "")
        res.append(r)
    json.dump(res, open(creer_dossier(sortie), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("%d règle(s) écrite(s) dans %s ; %d gardé(s) tel(s) quel(s) ; %d non tranché(s)" % (len(res), sortie, garde, non))
    if sans:
        print("tranchés mais sans « regle » (à traiter à la main) : " + ", ".join(sans))
    if meta.get("general"):
        print("remarque générale : " + meta["general"])


if __name__ == "__main__":
    if len(sys.argv) >= 4 and sys.argv[1] == "generer":
        generer(sys.argv[2], sys.argv[3])
    elif len(sys.argv) >= 5 and sys.argv[1] == "regles":
        regles(sys.argv[2], sys.argv[3], sys.argv[4])
    else:
        print(__doc__); sys.exit(2)
