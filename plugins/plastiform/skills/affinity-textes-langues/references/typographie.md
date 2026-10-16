# Règles typographiques prêtes à l'emploi (corrections_textes.js)

Règles regex (syntaxe JavaScript, échappées pour JSON : `\\d` dans le fichier). Le remplacement réécrit la
correspondance entière (`$1`, `$2`… = groupes ; `$&` = tout) : englober le moins de caractères possible (les
lookbehind `(?<=…)` et lookahead `(?=…)` ne sont pas réécrits). Toujours en **simulation** d'abord : relire les
contextes (codes produits, unités, heures « min : sec » des fiches…), exclure par `s` / `pages` / `calque` si besoin.
Espaces : ` ` insécable, ` ` fine insécable.

## Toutes langues
```json
[
 {"re": "(?<=\\S) {2,}(?=\\S)", "r": " ", "note": "doubles espaces"},
 {"re": "(?<=\\S) +,", "r": ",", "note": "espace avant virgule"},
 {"re": "(?<=\\S) +\\.(?=\\s|$)", "r": ".", "note": "espace avant point final"},
 {"re": "cm3\\b", "r": "cm³", "note": "exposant"},
 {"re": "\\bm2\\b", "r": "m²", "note": "exposant (vérifier : pas une référence produit)"}
]
```

## Français
```json
[
 {"re": "(?<=\\S) ?:(?=\\s)", "r": " :", "note": "insécable avant deux-points (436 occ. dans les fiches)"},
 {"re": "(?<=\\S) ?([;!?])", "r": " $1", "note": "fine insécable avant ; ! ? (si la charte l'emploie)"},
 {"re": "(\\d) ?%", "r": "$1 %", "note": "insécable avant %"},
 {"re": "(\\d) ?°C", "r": "$1 °C", "note": "insécable avant °C"},
 {"re": "«(?![\\u00a0\\u202f]) ?", "r": "« ", "note": "insécable après guillemet ouvrant (seulement s'il manque)"},
 {"re": "(?<![\\u00a0\\u202f]) ?»", "r": " »", "note": "insécable avant guillemet fermant (seulement s'il manque)"},
 {"re": "(\\d) (?=(mm|cm|ml|L|g|kg|µm|min|s|h)\\b)", "r": "$1 ", "note": "nombre et unité solidaires"},
 {"f": "Trés", "r": "Très"}
]
```
Vérifier : « Très souple », « Semi-Souple » (Rivelec), majuscules accentuées (É, À) dans les titres en capitales.

## Anglais
```json
[
 {"re": "(?<=\\d) %", "r": "%", "note": "pas d'espace avant % en anglais"},
 {"re": "(?<=\\w) :", "r": ":", "note": "pas d'espace avant deux-points"},
 {"re": "(\\d),(\\d)", "r": "$1.$2", "note": "virgule décimale → point (vérifier : pas un séparateur de liste)"},
 {"f": "Recommanded", "r": "Recommended"},
 {"f": "recommanded", "r": "recommended"},
 {"f": "Recommandation", "r": "Recommendation"}
]
```
Rivelec : « Manual Putty » (jamais « malleable »), « Curing time » (pas « Setting time »).

## Allemand
```json
[
 {"re": "(\\d)°C", "r": "$1 °C", "note": "espace entre nombre et °C"},
 {"re": "(\\d)%", "r": "$1 %", "note": "espace avant % (usage DIN 5008)"},
 {"re": "(\\d)\\.(\\d)", "r": "$1,$2", "note": "point décimal → virgule (vérifier : pas une date ni une version)"},
 {"re": "\"([^\"]+)\"", "r": "„$1“", "note": "guillemets allemands"}
]
```
Rivelec : lexique `Lexique_Allemand_catalogues_supports_DEFINITIF_12-10-26.xlsx` (Maßabdruck, Mischdüse,
Entformungswiderstand, Hinterschnitt…) ; contrôle par `aligner_langues.py --lexique … --langue DE --proscrits …:2`.
Noms : majuscule initiale ; mots composés soudés ou avec trait d'union (« 400-ml-Kartusche »).

## Espagnol
```json
[
 {"re": "(\\d)\\.(\\d)", "r": "$1,$2", "note": "point décimal → virgule (vérifier)"},
 {"re": "(\\d)º ?C", "r": "$1 °C", "note": "indicateur ordinal º pris pour le degré °"},
 {"re": "(\\d)%", "r": "$1 %", "note": "espace avant % (RAE)"}
]
```
Vérifier ¿ … ? et ¡ … ! ouvrants ; « Versión » (accent) dans les pieds de page des fiches.
