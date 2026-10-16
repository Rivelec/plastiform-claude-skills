---
name: affinity-nouveau-projet
description: "Crée un projet Affinity multilingue propre : dossier, projet.json, BASE commune + un fichier par langue, images liées uniquement, BASE liée sous chaque planche, scripts d'export. Pour démarrer un catalogue, des fiches, une brochure ou un gabarit, même sans parler de « projet »."
---

# Nouveau projet Affinity (images liées uniquement)

Objectif : un dossier où tout ce qui est commun aux langues est dans une **BASE**, où chaque langue est un fichier
qui place la BASE **en lien**, où **aucune image n'est incorporée** (tout vient de `Images/`), et où versions,
exports et données sont pilotés par `projet.json`. C'est la structure qui a fait passer le catalogue 2026 de 2,9 Go
de fichiers dupliqués à ~240 Mo maintenables.

Prérequis : skill `affinity-pilotage` (procédure « Exécuter un outil », règles de sécurité, outils installés).

## 1. Cadrer (une question groupée, AskUserQuestion)
Demander ce qui n'est pas évident, avec des valeurs par défaut :
- Type : publication complète déclinée en variantes (catalogue, brochure) **ou** éléments indépendants exportés un
  par un (fiches techniques). Nom, préfixe de référence (ex. `BRO_RIV`), année, version de départ (1.0).
- Langues (FR = référence) et, pour une publication, numéros de document par langue et variantes (avec/sans prix…).
- Format et pages : A4 210 × 297 mm, vis-à-vis ou non, nombre de pages de départ, **fond perdu** (3 mm si impression).
- Profil couleur : « Coated FOGRA39 » (Europe, couché, recommandé) ou « U.S. Web Coated (SWOP) v2 » (profil des
  documents Rivelec existants) — à confirmer avec l'imprimeur.
- Supports : WEB (écran) et/ou IMP (imprimeur) ; données communes à centraliser (prix…) ?
- Emplacement : par défaut `Cowork/Plastiform/<Famille>/<PRÉFIXE>_<…>` (jamais dans un dossier de sauvegarde).

## 2. Créer le dossier et projet.json (shell du Mac)
```bash
O="$HOME/mnt/Cowork/_Outils_Affinity"
python3 "$O/python/projet.py" creer "$HOME/mnt/Cowork/Plastiform/Brochures/BRO_RIV_50_FLYER-2026" \
  --type catalogue --nom "Flyer Plastiform 2026" --prefixe BRO_RIV --annee 2026 --langues FR,EN,DE \
  --numeros FR:50,EN:51,DE:52 --variantes AP,SP --supports WEB,IMP [--donnees]
python3 "$O/python/projet.py" valider "<dossier>"
```
(`--type fiches` : section `decoupage`, dossier `PDF/`, CHANGELOG par fiche (une version par fiche, imprimée sur la
fiche), LISEZMOI des fiches (« Export par élément ») ; `--prefixe-fichiers TEC_FTE_RIV_15-10-26`.)
Résultat : `Images/ Fonts/ Scripts/ EXPORTS/ (PDF/ pour les fiches) _travail/`, `projet.json` commenté, `CLAUDE.md`
(règles du projet), `LISEZMOI.txt` (mode d'emploi pour l'utilisateur), `CHANGELOG.md` (catalogue : section V1.0 non
publiée ; fiches : « Changements communs », puis une section par fiche), `tasks.md`, scripts de publication copiés
dans `Scripts/` (utilisables sur un autre poste). Relire `projet.json` avec l'utilisateur :
titres des PDF par langue, éléments variables (`elements` : calque `PRIX`, objets dont le nom contient un motif),
variantes (`afficher` / `masquer`), préréglages par support, `nom_fichier`, `verifications`.

## 3. Créer les documents (Affinity)
Avec `creer_document.js` (images **liées par défaut**, unités mm, 300 ppp, CMJN) — une suite :
```json
[["creer_document.js", {"chemin": "<Mac>/BASE.af", "format": [210, 297], "pages": 8, "vis_a_vis": true, "fond_perdu": 3, "profil": "Coated FOGRA39 (ISO 12647-2:2004)", "marges": [12, 12, 15, 12]}],
 ["creer_document.js", {"chemin": "<Mac>/FR.af", "format": [210, 297], "pages": 8, "vis_a_vis": true, "fond_perdu": 3, "profil": "Coated FOGRA39 (ISO 12647-2:2004)", "maquette": false}],
 ["creer_document.js", {"chemin": "<Mac>/EN.af", …}]]
```
Mêmes format, pages, vis-à-vis, fond perdu et profil pour la BASE et les langues (sinon les planches ne
correspondent plus). Contrôler une fois par l'interface : Fichier > Configuration du document > Placement des
images = « Préférer lié » (le SDK ne relit pas ce réglage) — `affinity-pilotage/references/interface.md`.

## 4. Construire la BASE (avec l'utilisateur, dans Affinity)
- Tout ce qui est identique dans toutes les langues : fonds, photos, pictos, logos, filets, maquettes, références
  produits, numéros de page. **Aucun texte de langue.**
- Images : copiées d'abord dans `Images/` (noms définitifs, sans espaces exotiques ; ne plus les renommer ensuite),
  puis Fichier > Insérer… depuis `Images/` (liées). Jamais de copier-coller d'image (incorporée), jamais de calque
  pixel peint (retouche → fichier dans `Images/`).
- Images à 300 ppp effectifs à leur plus grande taille d'utilisation : contrôler avec `inventaire_liens.js`, réduire
  les trop lourdes avec `optimiser_images.py` (taille physique conservée).
- Éléments à cacher selon la variante (pastille « prix », logo distributeur) : dans les fichiers de langue, calques
  nommés comme dans `projet.json` (`PRIX`, objets « …unceta… »). Ce qui varie par variante ne va pas dans la BASE.

## 5. Placer la BASE dans chaque langue
1. Dans chaque fichier de langue, **une fois à la main** (ou par l'interface) : Fichier > Insérer… `BASE.af`
   (« Remplacer existant » décoché) sur n'importe quelle planche → graine.
2. `placer_base.js` en simulation, puis `"mode": "application"` : la BASE est dupliquée au fond de chaque planche,
   planche N sur planche N, calée sur la planche (ou le fond perdu).
3. Contrôle : `inventaire_structure.js` (« planches sans document lié : aucune ») et un rendu par langue.

## 6. Textes, données, préréglages
- Textes de langue au niveau des pages (pas dans les maquettes : un texte de maquette ne peut pas varier par langue
  sans session « détaché »). Traductions : skill `affinity-textes-langues` et `relecture-multilingue`.
- Données communes (prix…) : skill `affinity-donnees-centralisees` (`donnees_extraire.js` → fichier de données →
  `appliquer_donnees.js`).
- Préréglages d'export nommés comme dans `projet.json` (une fois par poste) : `interface.md` § Préréglages.
- Dossier du projet ajouté aux dossiers autorisés d'Affinity (Réglages > Exécution de scripts).

## 7. Premier export et contrôle
- Export d'essai d'une langue et d'une variante (skill `publication-export-version`), puis
  `verif_pdfs.py --projet projet.json` et un coup d'œil aux pages.
- `python3 "$O/python/bilan_sante.py" "<dossier VM>"` après les inventaires : 0 image incorporée, 0 lien manquant,
  0 calque pixel, 0 police absente, BASE sur toutes les planches.
- `CHANGELOG.md` (création), `tasks.md` à jour ; montrer à l'utilisateur `LISEZMOI.txt` (où modifier quoi, comment
  exporter, comment monter la version).

## Conseils
- Garder les fichiers légers : pas d'aperçu inutile ; les outils qui modifient compactent ce qu'ils enregistrent,
  `compacter.js` pour le reste.
- Noms de calques stables (`PRIX`, `FR`, `TEXTE`…) : les scripts s'y fient.
- Ne pas mettre de texte de langue dans un document lié imbriqué : il ne serait pas traduisible par fichier.
- Un projet existant à reprendre dans cette structure : skill `affinity-migration`.
