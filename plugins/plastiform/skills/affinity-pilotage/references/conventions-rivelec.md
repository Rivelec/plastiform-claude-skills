# Profil Rivelec / Plastiform

Conventions des projets de mise en page Plastiform (Rivelec). Les skills sont génériques ; ce profil s'applique dès
que le projet est un document Plastiform / Rivelec. Le `CLAUDE.md` du projet prime en cas de conflit.

## Nommage
- Référence de document : `TYPE_ENTITÉ_NUM_ANNÉE_VX.Y`, ex. `BRO_RIV_38_2026_V1.0` (brochure / catalogue).
  Types : `BRO` brochure-catalogue, `TEC_FTE` fiche technique, `ETI` étiquette ; entités : `RIV` Rivelec, `KRI`…
- Fiches techniques : `TEC_FTE_RIV_<num>_<PRODUIT>_<LANGUE>` (numéro sur 3 chiffres, même numéro et même nom de
  produit dans toutes les langues, langue ISO 639-1 en majuscules) ; pied de page « Version X.Y » (FR, EN, DE),
  « Versión X.Y » (ES), sans date ; PDF `…_<LANGUE>_V<X>-<Y>.pdf`.
- Catalogue 2026 : numéros 38 FR avec prix, 39 EN avec prix, 40 FR sans prix, 41 EN sans prix, 42 ES (AP, SP,
  UNCETA), 43 DE ; 44-46 réservés. Fichiers d'export `<SUPPORT>_<LANGUE>_<VARIANTE>_<RÉF>.pdf` (WEB / IMP ; AP avec
  prix, SP sans prix, UNCETA_SP distributeur espagnol).
- Fichiers d'un projet : `BASE.af` + `FR.af`, `EN.af`… (catalogue) ou `<PRÉFIXE>_<date>_BASE.afpackage` +
  `…_FR.af` (fiches). Images dans `Images/`, polices dans `Fonts/`, scripts dans `Scripts/`, exports dans `EXPORTS/`
  ou `PDF/`.

## Versions, CHANGELOG, publication
- **Le français est la référence** : toute autre langue dit la même chose que le français.
- Toute modification de contenu = une ligne dans `CHANGELOG.md` (quoi, où : page / langue / fichier, ancienne →
  nouvelle valeur, source pour une donnée). Un changement de la BASE se note sur chaque élément qui l'affiche.
- **Une seule montée de version par cycle « non publié »** : si une section « Non publiée » existe déjà, ne pas
  remonter la version. Par défaut X.Y → X.(Y+1) ; X+1.0 si l'utilisateur le demande. Toutes les langues portent la
  même version.
- Catalogue / brochure : UNE version pour tout le document, dans `projet.json` (`projet.py version`), imprimée par
  l'export (référence) et reprise dans les noms de fichiers.
- Fiches techniques : une version PAR fiche, imprimée dans son pied de page (« Version X.Y », toutes les langues) et
  inscrite dans sa section du CHANGELOG (`## F20 – TEC_FTE_RIV_001` / `### Non publiée – Version X.Y`) :
  `projet.py version <dossier> --element "F20"` (ou `--tous`) ouvre le cycle, puis le pied de page est corrigé dans
  chaque langue (`corrections_textes.js`, règle limitée aux pages de la fiche) ; `export_par_element.js` nomme le PDF
  d'après la version imprimée. Le projet des fiches 2026 n'a pas de `projet.json` : en créer un à partir de
  `modeles/projet.fiches.json` avant d'utiliser `projet.py` (sans écraser CHANGELOG, CLAUDE.md ni Scripts/).
- **Seul l'utilisateur déclare une publication** (« je publie », « c'est en ligne ») : alors « Non publiée » →
  « Publiée le JJ/MM/AAAA » (`projet.py publier`). Le changement suivant ouvre un nouveau cycle.
- `tasks.md` : ce qui reste à faire ou à décider. Versions et numéros du catalogue : uniquement dans `projet.json`
  (ou `catalogue.json`) ; fiches : voir ci-dessus. Exports par script, jamais à la main.

## Données
- Fiches techniques : valeurs écrites en dur dans la BASE ; source = fiches techniques d'origine (PDF) ; **en cas
  d'écart avec la FDS, la FDS fait foi** (décision du service qualité, 12/10/2026) : valeur de la FDS la plus récente
  (plastiform.info, page « FDS / FT »), « ND » si non déterminé, « N/A » si non applicable ; noter la FDS et sa date
  de révision. Le site sert à repérer des écarts : les noter dans `tasks.md`, ne rien changer sans décision.
- Catalogue : prix uniquement dans `tarifs.json` (identiques dans les 4 langues), reportés par script ; une cellule
  sans « € » (ex. « Contáctenos ») n'est jamais écrasée.

## Terminologie
- Anglais : « Manual Putty » pour les malléables (jamais « malleable ») ; « Curing time » pour le temps de prise (ne
  pas remplacer par « Setting time »).
- Allemand : lexique `Lexique_Allemand_catalogues_supports_DEFINITIF_12-10-26.xlsx` (dossier des fiches techniques ;
  feuille 1 : EN / FR / DE validé ; feuille 2 : termes à proscrire → standard validé). Empreinte = « Maßabdruck »
  (nom seul ; « Abdruck » dans les composés) ; ne pas réintroduire Entfernungsbeschränkung, Doppelschneidmesser,
  Injektor / Spritzdüse, Extraktion / Entnahme, Verarbeitung (pour l'exploitation), Verfallsdatum…
- Français : espace insécable avant « : », « % », « °C » ; « Très souple », « Semi-Souple » ; « cm³ ».
- Produits : noms et données à vérifier dans le skill `plastiform-engineer` / `plastiform-brand` (ne rien inventer).

## Relectures et décisions
- Rapports classés **CRITIQUE / MAJEUR / MINEUR** (critique = faux ou dangereux : donnée technique, sécurité, prix,
  référence ; majeur = sens, terminologie, texte manquant ou caché ; mineur = style, typographie).
- Les choix qui reviennent à l'utilisateur passent par une **page de décision (QCM)** (`qcm.py`) : une carte par
  point, propositions, « garder l'actuel », « autre » ; ses réponses deviennent des règles JSON (`post_<LANGUE>.json`,
  `qcm.py regles`) appliquées par `corrections_textes.js` (simulation, puis application).
- Relecture native recommandée pour les textes traduits par Claude (les signaler dans `tasks.md`).

## Dossiers à ne pas toucher
- `Cowork/Plastiform/Tarif/1 - Tarifs` : sauvegarde de l'utilisateur — ni lecture pour modifier, ni ménage.
- Originaux déclarés dans le `CLAUDE.md` du projet (ex. `TEC_FTE_RIV_29-03-24.afpackage`, `../Images`, `../Fonts`).
- Dossiers personnels de l'utilisateur rangés dans Cowork : hors sujet (ni ouverture, ni liste, ni ménage).
- Le ménage (suppression d'anciennes versions, de PDF) se fait après validation de l'utilisateur.
