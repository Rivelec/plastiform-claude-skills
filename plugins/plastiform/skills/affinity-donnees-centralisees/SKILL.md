---
name: affinity-donnees-centralisees
description: Centralise prix et valeurs répétées d'une publication Affinity multilingue dans un fichier unique (JSON, Excel) et les reporte dans toutes les langues sans toucher à la mise en forme. Pour changer un prix, mettre à jour les tarifs ou vérifier qu'un chiffre est identique partout.
---

# Données centralisées (prix, valeurs répétées)

Une donnée saisie à la main dans quatre fichiers finit par différer (cas réel : prix ES ≠ FR, valeurs d'une autre
fiche affichées par une fusion Excel). La règle : **une seule source** (fichier de données), reportée par script.

Prérequis : `affinity-pilotage`. Référence : catalogue 2026, `tarifs.json` (93 tableaux, 4 langues).

## Mettre en place (une fois par projet)
1. Les données doivent être dans des blocs repérables : calque de premier niveau dédié (ex. `PRIX`) dans chaque
   fichier de langue, blocs à la même position d'une langue à l'autre (tableaux ou cadres).
2. Extraire depuis la langue de référence :
   `donnees_extraire.js {"doc": "<Mac>/FR.af", "calque": "PRIX", "garde": "€", "sortie": "<Mac>/<projet>/tarifs.json"}`
   → `{tableaux: [{page, planche, x, y, type, contexte, valeurs[]}]}` (segments = cellules d'un tableau ou
   paragraphes d'un cadre ; `garde` ne retient que les blocs qui contiennent ce texte).
3. Déclarer dans `projet.json` AVANT la vérification : `"donnees": {"fichier": "tarifs.json", "calque": "PRIX",
   "garde": "€", "tolerance": 8, "langues": ["FR", "EN", "ES", "DE"]}` (fichiers de langue pris dans
   `fichiers.langues`). Sans cette section, `appliquer_donnees.js` se rabat sur `tarifs.json`, le calque PRIX, la
   garde « € », les langues FR EN ES DE et des fichiers nommés `FR.af`, `EN.af`… : tout autre nommage échoue.
   La `tolerance` écrite dans le fichier de données par `donnees_extraire.js` prime sur celle de `projet.json`.
4. Vérifier que toutes les langues correspondent : `appliquer_donnees.js {"dossier": "<Mac>/<projet>/",
   "simulation": true}` (**sans `"simulation": true`, il applique**) → par langue, blocs introuvables (position
   différente), nombres de segments différents, valeurs qui différeraient. Corriger les écarts dans les documents
   (avec l'utilisateur) jusqu'à « 0 segment à modifier » partout.
5. Ajouter `Scripts/appliquer_donnees.js` au projet (copie de `_Outils_Affinity/publication/`) et la règle au
   `CLAUDE.md` (« tarifs uniquement dans tarifs.json »).

## Modifier des données
- Directement dans le JSON (Claude) : ne changer que `valeurs` (format affiché, ex. « 1 234,00 € »), jamais
  `page`, `planche`, `x`, `y`.
- Par l'utilisateur dans Excel :
  ```bash
  O="$HOME/mnt/Cowork/_Outils_Affinity"; P="$HOME/mnt/Cowork/<chemin du projet>"
  python3 "$O/python/donnees_tableur.py" exporter "$P/tarifs.json" "$P/Tarifs_a_modifier.xlsx"
  # l'utilisateur remplit la colonne « NOUVELLE VALEUR » (jaune), puis (même en-tête O=… P=… à chaque appel) :
  python3 "$O/python/donnees_tableur.py" importer "$P/Tarifs_a_modifier.xlsx" "$P/tarifs.json"             # simulation
  python3 "$O/python/donnees_tableur.py" importer "$P/Tarifs_a_modifier.xlsx" "$P/tarifs.json" --appliquer # sauvegarde .avant_<date>.json
  ```
- Hausse générale (ex. +3 %) : script Python sur le JSON (arrondi et format français), liste des changements montrée
  avant d'écrire.

## Reporter dans les documents
1. Simulation : `appliquer_donnees.js {"dossier": "<Mac>/<projet>/", "simulation": true}` → liste « p.36 F20 ligne 1 :
   60,00 € → 61,00 € » par langue ; vérifier qu'elle correspond exactement aux changements voulus.
2. Application : sans `simulation` (chaque fichier de langue est ouvert, modifié, **enregistré** en le réécrivant
   entier, refermé — puis rouvert s'il l'était ; un fichier ouvert et modifié par l'utilisateur, ou un `.afpackage`,
   est ignoré et signalé). Journal : `EXPORTS/donnees_log.txt`.
3. Contrôle : nouvelle simulation → « 0 segment à modifier » partout ; rendus des pages touchées.
4. CHANGELOG : une ligne par donnée (`projet.py noter … --rubrique "Tarifs"`) ; version si nécessaire ; export
   (skill `publication-export-version`) ; `aligner_langues.py` signale aussi les nombres qui diffèrent entre langues.

## Règles de sécurité intégrées
- Bloc retrouvé par planche + position (± `tolerance` px) : un bloc déplacé est « introuvable » et signalé, jamais
  écrit au hasard.
- Nombre de segments différent → bloc ignoré et signalé.
- Un segment qui ne contient pas le texte `garde` n'est jamais écrasé (ex. « Contáctenos » à la place d'un prix ES).
- Seuls les segments qui changent sont réécrits (mise en forme du 1er caractère conservée).

## Données techniques (fiches)
Même principe pour des valeurs de la BASE (densité, dureté…) mais la source fait foi : fiche technique d'origine,
et en cas d'écart **la FDS la plus récente fait foi** (profil Rivelec) ; noter la source et sa date dans le CHANGELOG.
Les valeurs de la BASE valent pour toutes les langues : une seule modification, puis exports.
