---
name: affinity-migration
description: Remet un document ou projet Affinity existant dans la structure propre (BASE liée + langues, images liées, ni calque pixel ni image incorporée) avec rendus avant/après. Pour réorganiser, alléger, découper par langue, lier les images, réparer des liens ou reprendre un .afpackage.
---

# Migrer un projet Affinity existant

Le modèle visé est celui du skill `affinity-nouveau-projet`. On y arrive par étapes réversibles, chacune vérifiée
au rendu. Ce qui a été fait sur le catalogue 2026 et les fiches techniques sert de référence
(`references/retours-experience.md`).

Prérequis : `affinity-pilotage` (outils, lanceur, règles de sécurité). Tout essai d'abord au banc.

## 0. Figer l'état initial
- Copie de sauvegarde si l'utilisateur n'en a pas (dans un dossier qu'il choisit) ; ne jamais toucher aux dossiers
  qu'il déclare comme sauvegarde ou original.
- Rendus de référence de toutes les pages de chaque fichier (`rendre_pages.js` `"pages": "toutes"`) : ils serviront
  à prouver qu'une étape n'a rien changé. Empreintes des fichiers (`shasum`) si utile.

## 1. Inventorier (lecture seule)
Suite : `inventaire_structure.js`, `inventaire_liens.js`, `inventaire_polices.js`, `inventaire_textes.js` par fichier,
puis `bilan_sante.py`. Repérer : liens manquants, images incorporées, calques pixel, ppp effectifs hors cible,
polices absentes, maquettes et textes enfermés dans les maquettes, objets identiques d'une langue à l'autre
(candidats pour la BASE), données répétées (prix), versions multiples de fichiers.

## 2. Plan (à valider par l'utilisateur)
Présenter le plan en étapes, chacune avec son contrôle, et les décisions à prendre (QCM si nombreuses : quelle
version garder, quelles variantes, quels fichiers supprimer après validation…). Ne rien supprimer avant validation.

## 3. Étapes types (dans cet ordre)
1. **Images dans `Images/`** : copier les fichiers liés dans `Images/` (noms définitifs), rebrancher les liens
   (Gestionnaire de ressources > Rechercher, `interface.md`), extraire les incorporées (`extraire_ressources.js`)
   puis « Remplacer… » par le même fichier (→ liées). Contrôle : `inventaire_liens.js` = 0 incorporée, 0 manquante.
2. **Calques pixel → fichiers liés** : `extraire_pixels.js` → `pixels_vers_fichiers.py` (TIFF CMJN, alpha non
   prémultiplié) → dans Affinity, image au même endroit et au même rang (`placer_image.js` `au_dessus_de` +
   `supprimer_reference`, puis Remplacer… pour la lier ; ou Fichier > Insérer… + `positionner.js`). Rendus comparés.
3. **Résolution** : `optimiser_images.py inventaire_liens.json --images Images/ --cible 300` (résultats dans
   `_optimisees/`, contrôlés), puis `--remplacer` (originaux dans `_originaux/`) ; rouvrir les documents
   (Affinity relit les fichiers) ; rendus comparés. TIFF Photoshop à calques : `--aplatir`.
4. **Polices** : installer celles du projet (`Fonts/`) ou `remplacer_polices.js` vers la police qu'Affinity
   affichait déjà (rendu identique au pixel) ; Gestionnaire de polices pour les références invisibles.
5. **Découpage BASE + langues** (si le document mélange les langues) : voir `references/decoupage.md` — copie
   « enregistrer sous » immédiatement après ouverture, suppression des objets de langue dans la BASE et des objets
   communs dans les langues, sortie des textes des maquettes (session « détaché »), `placer_base.js`, contrôle au pixel
   de chaque langue contre l'original.
6. **Variantes en calques nommés** (prix, distributeur…) et **références imprimées** reconnaissables par un motif ;
   `projet.json` (`projet.py convertir` depuis un ancien `catalogue.json`).
7. **Données répétées** : skill `affinity-donnees-centralisees`.
8. **Maquettes inutilisées** : supprimées (panneau Pages) après vérification qu'aucune page ne les utilise.
9. **Compactage** : `compacter.js` + `compacter_finaliser.sh` ; tailles avant/après dans le CHANGELOG.
10. **Exports** : scripts de publication + `verif_pdfs.py` + `diff_pdfs.py` contre les anciens PDF (différences
    attendues seulement).
11. **Ménage** (après validation explicite) : anciennes versions, fichiers de travail, images inutilisées (liste
    issue de `inventaire_liens.json` comparée au contenu de `Images/`) ; déplacer dans `_a_supprimer/` si la
    suppression n'est pas autorisée.
12. **Documentation** : `CLAUDE.md` (règles + pièges propres au projet), `LISEZMOI.txt`, `CHANGELOG.md` (section de
    la réorganisation : structure, images, corrections, nettoyage, compactage), `tasks.md`.

## Contrôles à chaque étape
Rendus avant / après + `comparer_rendus.py` (0 page signalée, ou seulement les changements voulus, vus à l'œil) ;
inventaires ; taille des fichiers ; journal dans `tasks.md`. En cas d'écart inexpliqué : arrêter, comprendre
(`affinity-pilotage/references/pieges.md`), revenir en arrière (`doc.undo()`, copie du banc).

## Références
- `references/decoupage.md` — découper un document multilingue en BASE + langues (méthode vérifiée).
- `references/retours-experience.md` — ce qui a été fait et mesuré sur le catalogue 2026 et les fiches techniques.
