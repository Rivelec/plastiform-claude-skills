# Catalogue des outils `_Outils_Affinity`

Emplacement : `~/Desktop/Cowork/_Outils_Affinity` (Mac) = `$HOME/mnt/Cowork/_Outils_Affinity` (shell). Version :
fichier `VERSION`. Chemins de documents dans les paramètres : **chemins Mac**. Durées mesurées sur le catalogue 2026
(56 pages, 29 planches) et les fiches techniques (133 pages, 67 planches).

Sommaire : 1. Mécanique — 2. Scripts Affinity (`affinity/`) — 3. Scripts de publication (`publication/`) —
4. Outils Python (`python/`) — 5. Scripts shell (`bin/`) — 6. Modèles (`modeles/`)

## 1. Mécanique

| Élément | Rôle |
|---|---|
| `bin/affinity_run.sh SCRIPT 'JSON'` / `--suite FICHIER.json` | prépare les copies uniques, `run/current.txt`, `run/args_<n>.json`, vide `run/out_run.txt` |
| `lanceur.js` | code à passer à `execute_script` (ou à coller dans l'éditeur de script) : exécute chaque ligne de `current.txt` |
| `bin/affinity_wait.sh [s=110]` | attend autant de `FIN` que de scripts préparés (`run/attendu.txt`), affiche le compte rendu ; code 2 si inachevé. Au-delà de 110 s : device_bash avec `timeout_ms` (max 180000) |
| `lib/affinity_lib.js` | bibliothèque (voir `api-sdk.md`) ; `L.job(fn)` : paramètres, exceptions, journal, `FIN` |
| `run/` | copies, paramètres, comptes rendus, JSON d'inventaire par défaut (`inventaire_liens.json`, …) |
| `config/chemins.env` | `RACINE_MAC`, `RACINE_VM`, `OUTILS_MAC` (à adapter si Cowork change de place) |
| `bibliotheque/` | code des 4 entrées de la bibliothèque de scripts d'Affinity (lanceur + chargeurs des scripts de publication, `environnement.md`) |

Suite : `[["inventaire_liens.js", {"docs": [...]}], ["rendre_pages.js", {...}]]` dans un fichier JSON (ex.
`run/_suite.json`) ; les scripts s'enchaînent dans le même appel, chacun avec ses paramètres.

## 2. Scripts Affinity (`affinity/`)

Tous : `"fermer": true` par défaut = un document ouvert par le script est refermé à la fin (sans enregistrer, sauf
mention) ; un document déjà ouvert reste ouvert. Les outils qui MODIFIENT et enregistrent (`corrections_textes`,
`remplacer_polices`, `placer_base` ; `placer_image` quand `"enregistrer": true`) n'appliquent rien sur un
`.afpackage` ni sur un document déjà ouvert avec des modifications non enregistrées (ARRÊT dans le compte rendu :
demander à l'utilisateur d'enregistrer). `placer_image` sans `enregistrer` modifie le document ouvert sans
l'enregistrer : à vérifier à l'écran. Les sorties
JSON vont dans `run/` par défaut ; un dossier de `"sortie"` absent est créé.

### inventaire_structure.js — structure
`{"docs": [..], "sortie"?}` → `run/structure.json` : par planche, pages, calques de premier niveau (nom, type,
visible, enfants), documents liés (BASE) ; maquettes et leurs objets. Compte rendu : calques par nom (ex.
`PRIX×42, FR×42, BASE.af×29`), planches sans BASE. ~6 s.

### inventaire_liens.js — images et documents liés
`{"docs": [..], "dossier_images"? (défaut <doc>/Images/), "sortie"?}` → `run/inventaire_liens.json` :
`docs[].comptes {lie, incorpore, manquant, raster, documents}`, `images[]` (page, calques, fichier, placement, ppi
effectif, px, octets), `rasters[]` (calques pixel), `fichiers{}` (par fichier : placements, pages, ppi min/max).
« manquant » = fichier absent de Images/ et du dossier du document (le SDK ne donne que le nom) : confirmer dans le
Gestionnaire de ressources. ~5 s par document.

### inventaire_polices.js — polices
`{"docs": [..]}` → `run/inventaire_polices.json` : par police PostScript : famille, nombre de caractères, absente
(comparée à `Font.all`), exemples de textes (planche, masqué). Planches ET maquettes. 1re énumération des polices
parfois > 60 s (cache) : `affinity_wait.sh`.

### inventaire_textes.js — textes
`{"doc", "planches"?, "calque"? (ancêtre ainsi nommé), "sortie"?}` → `run/textes_<doc>.json` : `[{si, page,
chemin, calques[], type, boite, visible, texte, cellules?}]`. Entrée de `aligner_langues.py`. ~20-30 s (56 p.).

### textes_debordants.js — textes cachés en bas de cadre
`{"doc", "planches"?, "tolerance"?: 2, "sortie"?, "fermer"?}` → `run/textes_debordants_<document>.json` `{debordants[], douteux[]}`. Méthode :
cadre étiré ×6, hauteur d'encre comparée, annulation. ~50 cadres/s (2 450 cadres : 50 s). Document laissé marqué
« modifié » s'il était déjà ouvert (contenu identique) ; refuse un document déjà ouvert avec des modifications non
enregistrées. « douteux » = colonnes ou cadre tourné (vérifier à l'écran).

### rendre_pages.js — rendus PNG
`{"doc", "dossier", "pages": [1, 2] | "toutes", "largeur"?: 1240, "prefixe"?: "p"}` → `<dossier>/p<page>_1.png`.
Échauffement automatique (documents liés chargés par `getSpreads`, polices). ~0,3 s par page.

### corrections_textes.js — rechercher / remplacer en gardant la mise en forme
`{"doc", "regles": "<fichier.json>" | [..], "mode": "simulation"|"application", "enregistrer"?: true,
"maquettes"?: false, "polices"?: {"normal", "gras"}, "sortie"?}`.
Règle : `{"f": "texte"}` ou `{"re": "regex", "flags": "i"}`, `"r": "remplacement ($1, **gras**)"`, options
`"exact": 1` (le bloc entier = f), `"pre": 1` (le bloc commence par f), `"s": 12 | [..]` (planches), `"pages": [..]`,
`"calque": "PRIX"`, `"attendu": n` (sinon règle bloquée), `"normal"`/`"gras"` (polices du balisage), `"note"`.
Positions sur le texte BRUT, de la fin vers le début, sans chevauchement ; textes des instances de maquette signalés,
pas modifiés. Sortie JSON : règles (trouvé/attendu/bloquée), occurrences (page, avant, remplacement). ~3 s (simulation).
Application : document ouvert par l'outil → enregistré **et compacté** ; déjà ouvert par l'utilisateur → enregistré
(compacter.js en fin de série). En simulation, une ligne « NB » prévient si l'application sera refusée.

### remplacer_polices.js — remplacer des polices
`{"docs": [..], "correspondances": {"AncienPS": "NouveauPS"}, "mode": "simulation"|"application", "maquettes"?: true,
"enregistrer"?: true}` : plage par plage (corps, couleur… conservés). Refuse si la police cible n'est pas installée.
Une police référencée sans texte visible (styles) : Gestionnaire de polices > Remplacer (`interface.md`).

### placer_base.js — BASE liée sous chaque planche
`{"doc", "base": "BASE" (texte du nom du fichier lié), "mode": "simulation"|"application", "enregistrer"?: true,
"fermer"?: true}`.
Préalable : une instance « graine » insérée à la main (Fichier > Insérer…, liée). Supprime les doublons, duplique la
graine, choisit la planche N de la BASE, cale sur la planche (ou sur le fond perdu si la BASE y est étendue :
détecté), enregistre (compacté). Vérifié : rendus identiques au pixel (fiches 67 planches 21 s ; catalogue 29 planches 8 s).

### creer_document.js — nouveau document
`{"chemin", "format": [210, 297], "pages": 4, "vis_a_vis": true, "fond_perdu": 3, "ppp": 300, "cmjn": true,
"profil": "Coated FOGRA39 (ISO 12647-2:2004)", "marges": [haut, droite, bas, gauche], "maquette": true,
"ecraser": false}` (mm). Placement des images **Lié** par défaut. Le SDK ne relit pas ce réglage : contrôle visuel
Fichier > Configuration du document.

### extraire_ressources.js — images incorporées → fichiers
`{"doc", "dossier"? (défaut Images/_extraites/), "ecraser"?}` : `saveOriginalFile` (fichier d'origine à l'octet près)
+ `extraites.json` (page, calques, ppp). Puis Gestionnaire de ressources > Remplacer (même fichier) pour lier.

### extraire_pixels.js — calques pixel → fichiers
`{"doc", "dossier"? (défaut Images/_pixels/), "planches"?, "min_px"?: 64}` → `<nom>.raw` (canevas, CMJNA 8 bits,
alpha non prémultiplié) + `<nom>.json` (local = zone peinte en px du canevas, boite = même zone en coordonnées
planche, transform). Puis `python/pixels_vers_fichiers.py` (TIFF CMJN ± alpha, ou PNG RVB).

### placer_image.js — placer un fichier image
`{"doc", "planche", "fichier", "boite"? [x,y,l,h], "proportions"?: true, "au_dessus_de"? "/2/0",
"supprimer_reference"?: false, "nom"?, "enregistrer"?: false}`. L'image créée par script est **incorporée** : la lier
ensuite (Gestionnaire de ressources > Remplacer… par le même fichier). Sert à remplacer un calque pixel au même endroit.

### positionner.js — ajuster l'objet sélectionné
`{"doc"?, "boite": [x,y,l,h], "proportions"?: true, "au_dessus_de"?, "supprimer_reference"?, "nom"?}` : pour une
image insérée par l'interface (liée) qu'il faut caler exactement (boîte issue d'un inventaire). N'enregistre pas.

### donnees_extraire.js — données répétées → JSON
`{"doc", "calque"? "PRIX", "garde"? "€", "sortie"?, "contexte"?: true}` → `{tableaux: [{page, planche, x, y, type,
contexte, valeurs[]}]}` ; segments = cellules (tableau) ou paragraphes (cadre). Vérifié : identique aux 93 tableaux
de `tarifs.json` du catalogue.

### documents.js — documents ouverts
`{}` : liste (chemin, pages, modifié, planche courante). `{"ouvrir": [..], "enregistrer": [..], "fermer": [..|"tous"],
"forcer"?: false}` (un document modifié n'est pas fermé sans `forcer`).

### compacter.js — compacter
`{"docs": [..]}` : enregistre `_c_<nom>.af` à côté (« enregistrer sous » réécrit tout) ; ignore un document ouvert
modifié et les `.afpackage` (non vérifié). Puis `bin/compacter_finaliser.sh <dossier VM>` (documents fermés).
Ex. 21,2 → 13,3 Mo. Inutile après les outils qui modifient : ils compactent eux-mêmes ce qu'ils ont ouvert.

### ping.js, dump_sdk.js
Test du lanceur (documents ouverts, préréglages) ; copie des modules du SDK dans `run/sdk/` (hors MCP).

## 3. Scripts de publication (`publication/`) — autonomes

Utilisables sans Claude (bibliothèque Affinity ou éditeur de script, document du projet ouvert) et par Claude (via
`affinity_run.sh` : `run/args.json` lu). Le projet est retrouvé à partir des documents ouverts (`projet.json` dans
le dossier du document ou au-dessus) ou du paramètre `dossier`.

### export_publication.js
Langue × variante × support d'après `projet.json` (ou l'ancien `catalogue.json`) : éléments variables affichés /
masqués (calques nommés ou objets dont le nom contient un motif), référence imprimée remplacée, préréglage choisi
(1er existant), titre/sujet/auteur du PDF écrits (mise à jour incrémentale), journal `export_log.txt`. Fichiers de
langue refermés sans enregistrer ; une langue ouverte avec des modifications non enregistrées est IGNORÉE (l'export
la refermerait : modifications perdues) — souvent le cas d'un fichier de langue ouvert à la main (lien vers la BASE) :
lancer l'export depuis la BASE. Paramètres Claude : `{"dossier", "langues", "variantes", "supports", "sortie"}`.
Durée : ~1 à 3 min par PDF (catalogue 56 p.). Préréglages : `interface.md` § Préréglages.

### export_par_element.js
Un PDF par élément (fiche) et par langue : début = page contenant le titre repère (`decoupage.debut`), référence et
version lues dans les pages, titre du PDF par langue, contournement « page précédente » (fiches XL). Sans
`projet.json` : réglages des fiches Rivelec. Paramètres Claude : `{"dossier", "langues", "references", "sortie"}`.
Un document déjà ouvert est exporté tel qu'il est affiché (modifications non enregistrées comprises) et laissé
ouvert ; les autres sont ouverts puis refermés sans enregistrer. Nom et titre du PDF viennent de la référence et de
la version IMPRIMÉES sur la fiche. ~10 s par fiche.

### appliquer_donnees.js
Reporte le fichier de données (ex. `tarifs.json`) dans tous les fichiers de langue : bloc repéré par planche + x, y
(± tolérance) dans le calque indiqué ; segments comparés ; seuls ceux qui changent sont réécrits ; un segment sans le
texte « garde » (ex. « € ») n'est jamais écrasé. Enregistre chaque langue modifiée en la réécrivant entière (pas de
grossissement). **Applique par défaut** : passer `"simulation": true` d'abord. Paramètres Claude : `{"dossier",
"langues", "simulation"}`. Sans section `donnees` dans `projet.json` : `tarifs.json`, calque PRIX, garde €, langues
FR EN ES DE, fichiers `{langue}.af`. Tolérance : celle du fichier de données (écrite par `donnees_extraire.js`) prime
sur celle de `projet.json`. Langue ouverte et modifiée, ou `.afpackage` : ignorée (signalé). ~7 s pour 4 langues.

## 4. Outils Python (`python/`) — dans le shell du Mac

| Outil | Usage |
|---|---|
| `projet.py creer DOSSIER --type catalogue|fiches --nom --prefixe [--annee --version --langues FR,EN --numeros FR:38 --variantes --supports --donnees --prefixe-fichiers]` | arborescence, projet.json, docs, scripts de publication copiés |
| `projet.py valider|etat DOSSIER` | contrôle de projet.json ; état (version, fichiers, verrous, exports périmés, journaux) |
| `projet.py convertir DOSSIER` | ancien catalogue.json → projet.json |
| `projet.py version DOSSIER [X.Y] [--forcer] [--element E[,E2] \| --tous]` | +0.1 par défaut ; refusé si version courante non publiée. Fiches (mode éléments) : version PAR élément (dernière publiée +0.1), à reporter ensuite sur le pied de page imprimé |
| `projet.py noter DOSSIER "texte" [--rubrique R] [--element E]` | ligne de CHANGELOG (section en cours, ou de l'élément ; refusé si sa version est publiée) |
| `projet.py publier DOSSIER [--date] [--element E[,E2] \| --tous]` | sur décision de l'utilisateur uniquement |
| `comparer_rendus.py AVANT/ APRES/ [--seuil 64 --tolerance 200 --html f.html]` | pages qui diffèrent, images `_diff/` en rouge, planche-contact |
| `verif_pdfs.py PDF|DOSSIER… [--projet projet.json --md --json --pages --ppp-min --requis --interdits --modele --motif-ref]` | rapport CRITIQUE/MAJEUR/MINEUR (structure, polices, images, fond perdu, références, titres, notes oubliées) |
| `diff_pdfs.py ANCIEN NOUVEAU [--visuel --md --json]` | changements de texte par page + brouillon de CHANGELOG ; dossiers appariés sans la version |
| `compresser_pdf.py PDF… [--ppp 150 --qualite 85 --remplacer]` | allège un PDF écran (Ghostscript), métadonnées conservées (ex. 30 → 9 Mo) |
| `optimiser_images.py inventaire_liens.json --images Images/ [--cible 300 --marge 1.2 --remplacer --aplatir]` | ramène à N ppp effectifs, taille physique conservée (DPI ajusté) |
| `pixels_vers_fichiers.py DOSSIER [--recadrer]` | .raw de `extraire_pixels.js` → TIFF CMJN(A) / PNG |
| `bilan_sante.py DOSSIER [--run --md]` | bilan à partir des inventaires de `run/` (limités au dossier du projet) |
| `aligner_langues.py REF.json CIBLE.json [--lexique f.xlsx --langue DE --proscrits f.xlsx:2 --md --json --qcm q.json]` | non traduit, nombres, blocs manquants, lexique, termes proscrits |
| `qcm.py generer Q.json SORTIE.html` / `qcm.py regles Q.json REPONSES.txt REGLES.json` | page de décision ; réponses → règles de `corrections_textes.js` |
| `donnees_tableur.py exporter D.json T.xlsx` / `importer T.xlsx D.json [--appliquer]` | données centralisées ↔ Excel |

## 5. Scripts shell (`bin/`)
`affinity_run.sh SCRIPT 'JSON'` / `--suite FICHIER` (chemin absolu, ou relatif au dossier courant ou aux outils),
`affinity_wait.sh [s=110]`, `chemins.sh mac|vm CHEMIN…`, `compacter_finaliser.sh DOSSIER_VM` (remplace X.af par
_c_X.af, originaux dans `_avant_compactage/`).

## 6. Modèles (`modeles/`)
`projet.catalogue.json`, `projet.fiches.json` (gabarits commentés), `CLAUDE.md`, `LISEZMOI.txt` /
`LISEZMOI.fiches.txt`, `CHANGELOG.md` / `CHANGELOG.fiches.md`, `tasks.md` (documentation d'un nouveau projet, variante
« fiches » choisie par `projet.py creer --type fiches`), `qcm.html` (page de décision).
