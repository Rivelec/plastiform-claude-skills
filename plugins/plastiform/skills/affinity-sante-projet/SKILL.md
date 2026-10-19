---
name: affinity-sante-projet
description: "Bilan de santé en lecture seule des fichiers .af d'un projet : liens, images, polices, structure, textes qui débordent, exports périmés, poids ; rapport CRITIQUE / MAJEUR / MINEUR. Pour « vérifie », « audite », « fais le point » sur le projet (les PDF exportés : revue-pdf)."
---

# Bilan de santé d'un projet Affinity

Un bilan ne modifie rien : il inventorie, mesure et propose. Les corrections se font ensuite (avec l'accord de
l'utilisateur) par les skills `affinity-migration`, `affinity-textes-langues`, `publication-export-version`.

Prérequis : `affinity-pilotage` (procédure « Exécuter un outil »).

## 1. Repérer le projet
```bash
O="$HOME/mnt/Cowork/_Outils_Affinity"; P="$HOME/mnt/Cowork/<chemin du projet>"
python3 "$O/python/projet.py" etat "$P"          # + : python3 "$O/python/projet.py" valider "$P"  (si projet.json)
```
Version(s), état (non publiée / publiée ; par fiche en mode éléments), fichiers .af et leurs dates, verrous
`~lock~`, exports plus anciens que les documents, derniers journaux.

## 2. Inventaires (une suite, documents du projet seulement)
```json
[["inventaire_structure.js", {"docs": ["<Mac>/BASE.af", "<Mac>/FR.af", "<Mac>/EN.af"]}],
 ["inventaire_liens.js", {"docs": ["<Mac>/BASE.af", "<Mac>/FR.af", "<Mac>/EN.af"]}],
 ["inventaire_polices.js", {"docs": ["<Mac>/BASE.af", "<Mac>/FR.af", "<Mac>/EN.af"]}],
 ["textes_debordants.js", {"doc": "<Mac>/EN.af"}]]
```
`textes_debordants.js` pour chaque langue autre que la référence (les traductions débordent). Un verrou
`~lock~` ou un document ouvert et modifié : ne pas l'ouvrir par script, travailler sur une copie du banc.
Durée : ~1 min pour 4 fichiers de 56 pages (+ ~50 s par langue pour les débordements de 2 400 cadres).

## 3. Rapport
```bash
O="$HOME/mnt/Cowork/_Outils_Affinity"; P="$HOME/mnt/Cowork/<chemin du projet>"
python3 "$O/python/bilan_sante.py" "$P" --md "$P/_travail/BILAN_SANTE_<date>.md"
```
Le bilan ne retient que les documents du dossier. Compléter à la main ce que les outils ne voient pas :
- poids : comparer la taille des .af à leur contenu (un fichier de langue > 30 Mo cache souvent des images
  incorporées, un aperçu ou des enregistrements par script non compactés) ;
- images utilisées vs présentes : fichiers de `Images/` absents de `inventaire_liens.json` = inutilisés (candidats au
  ménage, après validation) ;
- PDF existants : `python3 "$O/python/verif_pdfs.py" "$P/EXPORTS" --projet "$P/projet.json"` (skill `revue-pdf`) ;
- conformité au `CLAUDE.md` du projet (règles propres).

## 4. Présenter
Résumé en quelques lignes (nombre de points par gravité, les 3 plus importants), puis le tableau complet en fichier
(ou en artefact si l'utilisateur veut le partager). Pour chaque point : constat, impact (impression, poids,
maintenance), action, outil, risque. Gravité :
- **CRITIQUE** : sortie fausse ou incomplète (lien manquant, police absente, texte caché dans un PDF publié,
  référence erronée) ;
- **MAJEUR** : qualité ou maintenance (image incorporée, calque pixel, < 250 ppp à l'impression, BASE absente d'une
  planche, export périmé) ;
- **MINEUR** : confort (verrou, documentation absente, image trop lourde, maquette inutilisée).
Proposer un ordre de correction ; s'il y a des choix (garder / supprimer…), une page de décision (`qcm.py`).
Noter le bilan dans `tasks.md` du projet (lien vers le rapport).

## Repères chiffrés (projets Rivelec, octobre 2026)
Catalogue 56 p. : BASE ~10 Mo, langue ~9-14 Mo, Images ~180 Mo ; fiches 133 p. : langue ~10 Mo, BASE ~15 Mo.
Images : cible 300 ppp effectifs (impression), 150-225 suffisent à l'écran ; > 450 = gaspillage.
