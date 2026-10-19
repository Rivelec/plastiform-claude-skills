# Pièges vérifiés et contournements

Constatés sur les projets catalogue 2026 (BRO_RIV_38-46) et fiches techniques (TEC_FTE_RIV), 08-15/10/2026.
Format : symptôme → cause → contournement. Ajouter ici toute nouvelle découverte (et un hint MCP).

Sommaire : Pilotage — Documents et enregistrement — Textes — Maquettes — Documents liés et images — Exports et
PDF — Polices — Interface — Fichiers et dossiers — Données

## Pilotage
- **« The preamble documentation topic has not yet been read »** → le MCP exige la lecture du préambule (et la
  redemande après un ajout de hint) → `read_sdk_documentation_topic("preamble")` puis relancer.
- **Le MCP ne rend pas la main (60 s)** → délai de l'outil, le script continue → ne pas relancer ;
  `bin/affinity_wait.sh 170` dans un appel device_bash avec `timeout_ms: 180000`. Un script vraiment bloqué : boîte
  de dialogue ouverte dans Affinity (capture d'écran).
- **device_bash ne renvoie rien après 120 s** → délai par défaut du shell du Mac (la commande est coupée, sa sortie
  perdue) → `timeout_ms` (max 180000) ou attentes ≤ 110 s (`affinity_wait.sh` sans argument).
- **Variable vide, « No such file » sur un chemin relatif** → chaque appel device_bash est un shell neuf → redéfinir
  `O=…` / `P=…` dans chaque commande, chemins absolus.
- **Script modifié non relu** → cache des modules par chemin → nouvelle copie à chaque exécution (`affinity_run.sh`).
- **COMMAND_FAILED / commande sans effet** → planche non courante → `createSetCurrentSpread` (pas si déjà courante).
- **MCP « not running / not enabled »** → Réglages d'Affinity > MCP désactivé ou Affinity à redémarrer après
  modification des réglages → `environnement.md` § Réglages ; en attendant, lanceur dans l'éditeur de script.
- **PERMISSION_DENIED / NOT_ALLOWED sur fs** → dossier non autorisé (Réglages > Exécution de scripts) ou, dans
  l'éditeur de script, case « Système de fichiers » décochée (à recocher après chaque redémarrage).
- **Plantage d'Affinity pendant une longue série** (plusieurs gros documents + exports) → un document à la fois ;
  après plantage, rouvrir, vérifier les PDF (`pdfinfo` : « Couldn't find trailer dictionary » = PDF tronqué), effacer
  les verrous `~lock~` restés (Affinity fermé).

## Documents et enregistrement
- **Le fichier grossit à chaque enregistrement par script** (+7 Mo par passage sur un fichier de langue du catalogue)
  → `doc.save()` ajoute → `L.enregistrerCompact(doc)` (saveAs vers un nom temporaire, fs.rename ; fait par les outils
  qui modifient) ou `compacter.js` + `compacter_finaliser.sh`. L'enregistrement par l'interface (Cmd+S) réécrit, lui.
- **Fichier de 4 à 28 Go corrompu (BAD_FILE_DESCRIPTOR)** → enregistrement juste après un rechargement, ou `save()`
  sur un package fraîchement ouvert → `saveAs` vers un autre nom, contrôler la taille, puis remplacer ; package :
  `saveAs` immédiatement après `load`, réessayer une fois. Les outils refusent donc de modifier un `.afpackage`
  (`L.interditModifier`) : corriger un package dans l'interface, ou le convertir en .af (skill `affinity-migration`).
- **Modifications de l'utilisateur enregistrées par un outil** → `doc.save()` sur un document qu'il avait ouvert et
  modifié → les outils qui modifient refusent un document ouvert `isDirty` (ARRÊT) : lui demander Cmd+S d'abord.
- **`saveAs` vers un chemin ouvert/fermé dans la session → document « DISPOSED »** → supprimer la cible avant,
  réacquérir le document par son chemin (`Document.all.find`).
- **Document « modifié » dès l'ouverture** → rafraîchissement du lien vers la BASE → normal ; ne pas l'enregistrer
  pendant un export ; l'enregistrer ensuite si l'utilisateur le souhaite.
- **Un document enregistré pendant une session « détaché » rouvre dans cette session** → toujours « Terminer » avant
  d'enregistrer.

## Textes
- **Gras perdu** → `setText()` sur le nœud entier → remplacer des plages (`createSetText` + `TextSelection`).
- **Texte ajouté au lieu d'être remplacé** → `createSetText` sans sous-sélection de texte.
- **Remplacements décalés** → positions calculées sur `getText()` (format par défaut) alors que les champs y sont
  développés → positions sur le texte brut (`StoryIoFormat.Raw`) ; remplacer de la fin vers le début.
- **Corps minuscules après copie d'attributs** (12 pt → 1,44 pt) → facteur dpi/72 des StoryDelta, 1 pour certains
  cadres → appliquer tel quel puis réparer les corps < 4,5 pt, ou étalonner par cadre (`api-sdk.md` § 5).
- **Retraits perdus sur un remplacement multi-paragraphes** → attributs du 1er paragraphe propagés → ne remplacer
  que les sous-chaînes qui changent, ou réappliquer les attributs de paragraphe.
- **Tableau détruit (tout dans la 1re colonne)** → `createSetText` sur tout le tableau → écrire cellule par cellule,
  de la dernière à la première ; cellules = sauts `TableCell` seulement.
- **Texte « introuvable » pour le script** (nom « ￼ », `getText()` vide) → objet épinglé (icône + texte) →
  parcourir `NodeChildType.StoryPin` ; toujours vérifier au rendu avant de conclure qu'un texte manque.
- **« 1,35g/cm3 » ou « 0% » introuvables** → champs de fusion de données → `dataMergeFieldGlyphs`.
- **Rechercher/Remplacer de l'interface ne voit pas certains textes** → textes dans des instances de maquette.
- **Script refusé : « Invalid regular expression: missing / »** → U+2029 littéral dans le source (c'est un saut de
  ligne pour JavaScript) → écrire la séquence d'échappement `\u2029` (6 caractères ASCII), ou `charCodeAt(i) === 0x2029`.

## Maquettes
- **Suppression / visibilité / déplacement sans effet dans une instance** → contenu de maquette → mode « Modifier
  élément détaché » (menu Calque > Maquette, ou Maj+Cmd+D sur l'instance sélectionnée par script), une session par
  niveau d'instance, « Terminer » à la fin. Les textes qui doivent varier par langue vont au niveau de la page.
- **Une sélection multiple d'instances n'ouvre qu'une session** → une instance par cycle.
- **Sortir tout un groupe de maquette a changé l'ordre d'empilement** (photo au-dessus du QR code) → ne sortir que
  les groupes de texte ; comparer les rendus ; `doc.undo()` en boucle pour revenir en arrière.
- **Maquette impossible à supprimer par script** → panneau Pages, corbeille (faisable en arrière-plan).

## Documents liés et images
- **Rendu PNG flou du document lié (BASE) juste après l'ouverture** → aperçu basse définition tant que le document
  lié n'est pas chargé ; relancer l'export ne suffit pas → `getSpreads(false)` sur chaque instance (fait par
  `L.echauffer`). Les PDF, eux, sortent nets.
- **PDF par fiche : 1re page des fiches XL sans la BASE** (logo, photo, valeurs), alors que le document et le PDF
  complet sont justes ; non corrigé par `getSpreads` → exporter à partir de la page précédente puis retirer la 1re
  page du PDF (option `page_precedente` d'`export_par_element.js`). Contrôle : un texte de la BASE (ex. « Shore »)
  présent en page 1 de chaque PDF (`diff_pdfs.py` le voit aussitôt).
- **BASE réduite / décalée après ajout ou suppression de pages dans la BASE** → re-sélectionner la planche
  (`createSetEmbeddedDocumentSelectedSpreadID`) et recaler (`placer_base.js`).
- **Insérer la BASE remplit le cadre sélectionné** → décocher « Remplacer existant » dans la barre d'outils.
- **Le SDK ne change pas le chemin d'un lien** → pour rebrancher toutes les images : rendre l'ancien dossier
  introuvable, ouvrir le fichier, « Rechercher » dans le Gestionnaire de ressources et désigner une image du nouveau
  dossier : Affinity retrouve les autres.
- **Gestionnaire de ressources > « Lier… » crée un fichier sans extension (`_1`)** → utiliser « Remplacer… » par le
  fichier extrait (`extraire_ressources.js`).
- **Image de fond incorporée une fois par fiche (PDF deux fois plus lourd)** → fermer et rouvrir le document sans
  enregistrer, puis réexporter (mutualisation).
- **Calque pixel ou image peinte dans le .af** → alourdit le fichier, invisible dans Images/ → `extraire_pixels.js`,
  fichier dans Images/, placement lié au même endroit, suppression du calque (rendus comparés).
- **Taille d'image changée par un fichier remplacé** → réduire en gardant la taille physique (DPI ajusté,
  `optimiser_images.py`) ; contrôler au rendu.

## Exports et PDF
- **Export en police de secours ou flou** → export juste après l'ouverture → `L.echauffer(doc)` (fait par les scripts
  de publication).
- **Réglages d'export impossibles par script** → créer un préréglage dans l'interface (nom exact attendu par
  projet.json) ; les scripts prennent le 1er préréglage existant de la liste.
- **« PDF (numérique - petit format) »** → images à 72 ppp, photos et QR codes flous : ne pas l'utiliser.
- **« PDF (pour impression) » sans fond perdu** → « PDF (Imprimerie) » = fond perdu 3 mm.
- **PDF écran lourd (~30 Mo) malgré « PPP au-delà de 150 »** → les images d'une BASE liée ne sont pas réduites →
  `compresser_pdf.py --ppp 150` (ex. 30 → 9 Mo), contrôle visuel.
- **SVG d'un document lié rastérisé dans le PDF** → l'insérer directement dans le fichier de langue s'il doit rester
  vectoriel, ou l'accepter (taille native).
- **Titre du PDF = ancien nom de fichier** → écrire titre/sujet/auteur (scripts de publication, mise à jour
  incrémentale ; xref classique ou flux xref).

## Polices
- **Police absente** (Futura BT, Minion Pro…) → `inventaire_polices.js` (exemples de textes) puis
  `remplacer_polices.js` vers la police qu'Affinity affichait déjà (rendu identique) ou installer la police (Fonts/).
- **Police référencée sans texte visible** (styles, caractères invisibles) → Document > Gestionnaire de polices >
  Remplacer (rouvrir la fenêtre si elle est périmée).
- **`Font.create(…, 700)` → INVALID_ARGS** → énumération `FontWeight.Bold`.

## Interface
- **Une touche envoyée pendant que l'utilisateur travaille est refusée (« user interrupt »)** → le prévenir, attendre,
  outils `computer_app_*` en arrière-plan.
- **Capture d'écran impossible** → écran verrouillé : attendre l'utilisateur.
- **Dialogue d'export sur un autre écran / avertissement de contrôle en amont** → changer d'écran
  (`computer_switch_display`), « Ignorer et continuer » si l'avertissement est connu.
- **Panneau Ouvrir/Enregistrer du Mac** → processus distinct : Cmd+Maj+G, coller le chemin, Retour, OK (outils
  écran, pas `computer_app_*`).
- **Coller du code atterrit dans le canevas** → cliquer d'abord dans la zone de texte de l'éditeur de script.
- **Bibliothèque de scripts** : une entrée ne se supprime pas par le SDK et la confirmation « Supprimer le script… »
  ignore les clics simulés → choisir des titres définitifs, vérifier `list_library_scripts` avant d'enregistrer.

## Fichiers et dossiers
- **« Operation not permitted » en supprimant (shell du Mac)** → les dossiers connectés interdisent la suppression
  sans accord ; écrire en place (`tar --overwrite`, `> fichier`), déplacer (`mv`, autorisé dans un même dossier
  connecté), temporaires hors du dossier (`/tmp`), ou demander l'autorisation.
- **`device_commit_files` « written » mais fichier inchangé** → remplacement d'un fichier existant refusé en silence →
  écrire sous un nom nouveau (ex. archive horodatée) puis `tar --overwrite -xzf`.
- **Verrous `X.af~lock~` anciens** → document resté ouvert ou Affinity fermé brutalement ; ne pas ouvrir par script
  un document verrouillé (dialogue bloquant) : travailler sur une copie, signaler le verrou.

## Données
- **Une donnée technique diffère entre la fiche et la FDS** → la FDS fait foi (décision qualité Rivelec 12/10/2026) ;
  noter la source et la date de révision dans le CHANGELOG.
- **Données importées d'Excel par fusion** → écrites en dur ; la fusion affichait les valeurs d'un autre produit.
- **Prix différents d'une langue à l'autre** → `tarifs.json` + `appliquer_donnees.js` ; une cellule sans « € » (ex.
  « Contáctenos ») n'est jamais écrasée.
