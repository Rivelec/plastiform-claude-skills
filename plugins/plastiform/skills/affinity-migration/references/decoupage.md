# Découper un document multilingue en BASE + fichiers de langue

Méthode utilisée pour les fiches techniques (fichier unique FR/EN, 133 pages, textes dans des maquettes) et le
catalogue 2026 (4 fichiers de langue quasi identiques). Toujours au banc d'abord, sur 2 planches, puis en entier.

## A. Cas « un fichier par langue existe déjà, très redondant » (catalogue)
1. Comparer les langues objet par objet (`inventaire_textes.js` + `inventaire_structure.js` par langue ; même
   planche, même position, même contenu) : ce qui est identique dans toutes les langues = BASE (le catalogue : 465
   objets communs, ~40 objets propres à chaque langue, surtout là où l'allemand a été adapté).
2. BASE = copie du fichier de référence (FR) « enregistrée sous » `BASE.af` dès l'ouverture ; y supprimer tout objet
   de langue (textes, calques PRIX…) ; garder maquettes, fonds, images, références produits.
3. Chaque langue = copie de son fichier ; y supprimer les objets communs ; insérer la BASE (graine) puis
   `placer_base.js` ; la BASE peut être étendue au fond perdu (export imprimeur) : `placer_base.js` le détecte.
4. Contrôle par langue : rendus de toutes les pages comparés aux rendus d'origine (0 page signalée hors
   changements voulus).

## B. Cas « un seul fichier contient toutes les langues » (fiches techniques)
1. Repérer comment les langues sont séparées : calques nommés `FR` / `EN` / `TEXT FR`… (racines de langue), ou
   objets en double superposés, ou textes dans des maquettes différentes par langue.
2. Fichier de langue L = copie « enregistrée sous » immédiatement après ouverture (package : réessayer une fois en
   cas de BAD_FILE_DESCRIPTOR, contrôler la taille), puis :
   - supprimer les racines des AUTRES langues ;
   - supprimer tout ce qui n'est pas de la langue (ce qui ira dans la BASE) ;
   - révéler les racines de L masquées (sortir leurs enfants, supprimer le groupe vide) ;
   - textes enfermés dans des maquettes : session « Modifier élément détaché » par instance et par niveau
     (sélection par script → Maj+Cmd+D → `createMoveNodes` vers la page → « Terminer ») ; ~25 min pour 221 cycles ;
     un 1er cycle qui échoue après ouverture : le noter et refaire une passe.
3. BASE = copie dont on supprime les racines de toutes les langues ; données produit (tableaux) sorties des maquettes
   en ne déplaçant que les groupes de TEXTE (déplacer un groupe entier peut changer l'empilement).
4. `placer_base.js` dans chaque langue ; rendus comparés page à page à l'original (seuil 64, tolérance 200 px).
5. Maquettes devenues inutiles : supprimées (panneau Pages), rendu comparé.

## C. Ajouter une langue
Copie d'un fichier de langue existant (FR) « enregistrée sous » `XX.af` ; remplacer les textes (traduction validée,
`corrections_textes.js` avec règles `exact`, ou copie de textes depuis une source avec leurs attributs :
`createSetText` puis rejouer les `glyphAttRuns` / `paragraphAttRuns` de la source avec `StoryDelta`, en surveillant
le facteur d'unités) ; vérifier les débordements (`textes_debordants.js`) ; mettre à jour `projet.json` (fichiers,
exports, titres) ; relecture native.

## Contrôles finaux
- Chaque langue : 0 objet hors langue restant (hors BASE et maquettes), BASE sur toutes les planches, rendus OK.
- Toutes : `inventaire_liens.js` (0 incorporée / manquante), polices, `bilan_sante.py`.
- Exports : comparés aux anciens PDF (`diff_pdfs.py --visuel`) ; écarts expliqués dans le CHANGELOG.
