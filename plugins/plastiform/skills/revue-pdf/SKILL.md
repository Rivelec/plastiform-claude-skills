---
name: revue-pdf
description: "Revue de PDF exportés avant diffusion ou impression : contrôles automatiques, différences avec la version précédente, revue visuelle et de contenu, rapport CRITIQUE / MAJEUR / MINEUR, agent relecteur-independant. Pour relire, contrôler ou comparer des PDF (les fichiers .af : affinity-sante-projet)."
---

# Revue de PDF

Trois niveaux, du plus automatique au plus humain ; un rapport unique par gravité à la fin.

Prérequis : outils `_Outils_Affinity/python` (shell du Mac) ; `affinity-pilotage` pour les chemins. Les PDF à revoir
peuvent aussi être joints à la conversation : les traiter dans le conteneur (poppler, qpdf, Python y sont ; outils :
copie du plugin, `…/skills/affinity-pilotage/outils/python/`, à retrouver par Glob).
Chaque appel device_bash est un shell neuf : définir les variables dans chaque commande ; rapports dans
`"$P/_travail/revue/"` (créé au besoin par les outils ; `mkdir -p` avant `pdftoppm`).

## 1. Contrôles automatiques
```bash
O="$HOME/mnt/Cowork/_Outils_Affinity"; P="$HOME/mnt/Cowork/<chemin du projet>"; R="$P/_travail/revue"
python3 "$O/python/verif_pdfs.py" <PDF ou dossier> --projet "$P/projet.json" --md "$R/verif.md" --json "$R/verif.json"
```
Sans `projet.json` : `--pages`, `--ppp-min`, `--modele '{support}_{langue}_{variante}_{ref}.pdf'`, `--motif-ref`,
`--requis`, `--interdits`. Contrôle : structure (qpdf), pages, fond perdu par support, polices non incorporées,
images sous le seuil (5 % de marge), référence du nom imprimée et aucune autre référence, titre du PDF, textes requis
/ interdits (par variante : « € » en AP seulement), notes oubliées (« A SUPPRIMER », « ??? », TODO, Lorem ipsum).
Durée : ~15 s par PDF de 80 Mo.

## 2. Différences avec la version précédente
```bash
O="$HOME/mnt/Cowork/_Outils_Affinity"; P="$HOME/mnt/Cowork/<chemin du projet>"; R="$P/_travail/revue"
python3 "$O/python/diff_pdfs.py" <anciens PDF ou PDF> <nouveaux> --visuel --md "$R/differences.md"
```
Appariement des dossiers sans la version (`_V1.0`, `_V2-0`). Chaque changement de texte (page, avant → après,
contexte) et pages modifiées visuellement sans changement de texte. Tout changement non prévu par le CHANGELOG =
au moins MAJEUR. Le brouillon de CHANGELOG en fin de rapport sert à compléter celui du projet.

## 3. Revue visuelle et de contenu
- Rendus : `mkdir -p "$R/rendus" && pdftoppm -r 60 -png <pdf> "$R/rendus/p"` puis planche-contact (`montage
  "$R"/rendus/p-*.png -tile 6x -geometry +4+4 "$R/planche.png"`) ; regarder chaque page (Read sur l'image, après
  `device_stage_files` si elle est sur le Mac) : coupures de texte, images floues ou pixelisées, éléments qui
  débordent, pages blanches, couleurs, pastilles de variante, cohérence des numéros de page.
- Pages sensibles à zoomer (`pdftoppm -r 150 -f N -l N`) : couverture, pages de prix, tableaux techniques, dos
  (références, contacts, mentions légales), pages modifiées.
- Contenu : texte extrait (`pdftotext -layout`) — renvois (« voir page 50 » vs page réelle), prix (variante),
  données techniques vs source (FDS fait foi, profil Rivelec), noms de produits (skill `plastiform-engineer`),
  terminologie (skill `relecture-multilingue` pour les langues), coquilles.
- Comparaison entre langues d'un même document : `aligner_langues.py` sur les textes des fichiers .af (nombres,
  renvois de page, blocs manquants) — plus fiable que sur les PDF.

## 4. Rapport
Fichier `"$P/_travail/revue/RAPPORT_REVUE_<date>.md"` (ou artefact si l'utilisateur doit le partager), modèle :
```
# Revue — <document> — <date>
Verdict : prêt / prêt sous réserve / à corriger — n CRITIQUE, n MAJEUR, n MINEUR
## CRITIQUE   (faux, dangereux ou bloquant : donnée technique, prix, référence, page manquante, police absente)
- [PDF, page] constat — preuve (citation, mesure) — correction proposée
## MAJEUR     (visible et gênant : texte coupé, image floue, terminologie, renvoi faux, changement non prévu)
## MINEUR     (style, typographie, confort)
## Contrôles passés (ce qui a été vérifié et est conforme)
```
Une gravité se justifie par une preuve (citation exacte, numéro de page, mesure). Pas de faux positif non vérifié :
regarder la page avant de signaler.

## 5. Décisions et corrections
- Les points qui demandent un choix (formulation, garder / supprimer, valeur à confirmer) : page de décision
  `qcm.py generer` (une carte par point, propositions, recommandation), publiée en artefact ou envoyée en fichier ;
  réponses → `qcm.py regles` → `corrections_textes.js` (simulation puis application).
- Corrections dans les .af (skills `affinity-textes-langues`, `affinity-donnees-centralisees`), réexport (skill
  `publication-export-version`), puis nouvelle passe de `verif_pdfs.py` et `diff_pdfs.py` (ancien → corrigé) pour
  prouver que seules les corrections ont changé.

## Revue indépendante
Pour une impression, une mise en ligne ou un document client : confier une 2e revue à l'agent
**relecteur-independant** (il n'a pas vu le travail : il ne se note pas lui-même). Il travaille dans le CONTENEUR
(pas d'accès au Mac) : copier d'abord les fichiers avec `device_stage_files` (PDF, `projet.json`, `CHANGELOG.md`,
anciennes versions : ils arrivent sous `/mnt/user-data/uploads/…`), puis lui donner ces chemins du conteneur et les
exigences (variantes, langues, versions) — pas les conclusions de la 1re revue. Fusionner ensuite les deux rapports
(les points vus par un seul relecteur sont revérifiés).
