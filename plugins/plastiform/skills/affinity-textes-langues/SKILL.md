---
name: affinity-textes-langues
description: "Corrige les textes d'un fichier Affinity sans casser la mise en forme : règles JSON (gras, regex, exact) en simulation puis application, typographie par langue, tableaux, débordements. Pour corriger ou remplacer un texte, ou appliquer des corrections décidées (relecture : relecture-multilingue)."
---

# Textes et langues dans Affinity

Principe : ne jamais retaper un bloc entier (la mise en forme part avec : gras, corps, couleurs) ; remplacer des
**plages** précises, de la fin vers le début, sur le texte brut — c'est ce que fait `corrections_textes.js`.

Prérequis : `affinity-pilotage` (outils, lanceur, sécurité). Le français est la langue de référence (profil Rivelec).

## 1. Voir les textes
- `inventaire_textes.js` `{"doc", "calque"?, "planches"?}` → JSON (page, calques, boîte, visible, texte, cellules).
- Chercher dans le JSON (Python) avant d'écrire une règle : combien d'occurrences, où, dans quels calques ; les textes
  masqués (`visible: false`) existent mais ne s'impriment pas (variantes).
- Textes absents du JSON mais visibles au rendu : objets épinglés (parcourus), champs de fusion, instances de
  maquette (signalés par `corrections_textes.js`), texte vectorisé (pas un texte).

## 2. Écrire les règles (fichier JSON, ex. `Scripts/regles_EN.json` ou `post_<LANGUE>.json`)
```json
[
 {"f": "Recommanded", "r": "Recommended", "note": "coquille"},
 {"f": "Setting time", "r": "Curing time", "attendu": 23},
 {"re": "(\\d)%", "r": "$1 %", "note": "FR : espace insécable avant %"},
 {"f": "Implementation", "r": "Application example", "exact": 1, "s": 62},
 {"f": "Les produits Plastiform sont", "r": "Les produits **Plastiform** sont", "pages": [3]},
 {"f": "Ancien paragraphe complet…", "r": "Nouveau paragraphe complet…", "pre": 1, "s": 62}
]
```
`f` littéral (ou `re` regex JS, `$1`), `r` remplacement (`**gras**` ; `""` supprime), `exact` (le bloc entier, espaces
normalisés, vaut `f`), `pre` (le bloc commence par `f` : tout le bloc est remplacé), filtres `s` (planches 0…),
`pages`, `calque`, garde-fou `attendu` (nombre exact d'occurrences, sinon la règle n'est pas appliquée), polices du
balisage `normal` / `gras` (sinon déduites du bloc). Une règle = un changement compréhensible, avec une `note`.

## 3. Simuler, montrer, appliquer
1. `corrections_textes.js` `"mode": "simulation"` → compte par règle, occurrences (page, contexte avant,
   remplacement), règles bloquées (`attendu`), textes de maquette signalés. Vérifier les règles à 0 ou à trop
   d'occurrences ; ajuster.
2. Rendus « avant » des pages touchées (`rendre_pages.js`).
3. `"mode": "application"` (document ouvert par l'outil : enregistré et compacté ; document que l'utilisateur a
   ouvert : enregistré, à compacter en fin de série avec `compacter.js` ; `"enregistrer": false` pour ne pas
   enregistrer), rendus « après », `comparer_rendus.py` : seules les zones voulues changent ; regarder les pages
   signalées. L'outil REFUSE d'appliquer sur un `.afpackage` (corriger dans l'interface) et sur un document ouvert
   avec des modifications non enregistrées (demander Cmd+S).
4. CHANGELOG (`projet.py noter`).
Plusieurs langues : un fichier de règles par langue ; jamais de règle aveugle copiée d'une langue à l'autre.

## 4. Cas particuliers
- **Tableaux** : une règle s'applique dans les cellules comme ailleurs ; ne jamais remplacer un tableau entier
  (les cellules fusionnent). Données chiffrées communes : skill `affinity-donnees-centralisees`.
- **Maquettes** : un texte de maquette vaut pour toutes ses pages ; `"maquettes": true` traite les planches
  maîtresses ; un texte d'instance à modifier sur UNE page demande une session « détaché »
  (`affinity-pilotage/references/interface.md`).
- **Mise en forme d'une plage** sans changer le texte : script ponctuel avec `L.formaterPlage(doc, sp, n, a, b,
  StoryDelta.createPostscriptName('…'))`.
- **Débordements** (allemand, espagnol plus longs) : `textes_debordants.js` → liste par page ; corriger en
  raccourcissant (règle), en agrandissant le cadre (avec l'utilisateur : impact sur la mise en page) ou en réduisant
  le corps ; recontrôler.
- **Copier un texte d'un document à l'autre avec sa mise en forme** : `createSetText` puis rejouer les plages de la
  source (`glyphAttRuns` → `StoryDelta.createFromGlyphAtts`, `paragraphAttRuns` → `createFromParagraphAtts`) ;
  attention au facteur d'unités (corps divisés par dpi/72 dans certains cadres) : relire et réparer les corps
  < 4,5 pt.
- **Typographie** : `references/typographie.md` (règles prêtes à l'emploi par langue).

## 5. Traduire ou mettre à jour une langue
1. Partir du français (référence) ; textes alignés FR ↔ langue (`aligner_langues.py`, skill `relecture-multilingue`).
2. Terminologie imposée (profil Rivelec : lexique allemand, « Manual Putty », « Curing time ») ; ne rien inventer
   sur les produits (skill `plastiform-engineer`).
3. Règles `exact` / `pre` par bloc, simulation, application, débordements, rendus.
4. Textes traduits par Claude : les lister dans `tasks.md` pour relecture native.

## Références
- `references/typographie.md` — règles typographiques FR / EN / DE / ES en JSON prêtes à adapter.
