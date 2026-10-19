# Opérations par l'interface (computer use)

Pour ce que le SDK ne sait pas faire. Interface d'Affinity en français (menus cités tels qu'affichés).

## Règles de conduite
- **Prévenir l'utilisateur** avant de prendre l'écran (SendUserMessage : quoi, combien de temps) ; il peut être en
  train de travailler sur le Mac. Ne jamais appuyer sur Échap à sa place ; une touche refusée (« user interrupt »)
  = il travaille : attendre.
- Accès : `computer_resolve_access` / `computer_request_access` pour Affinity (accordé 30 min sans activité, à
  redemander ensuite). Préférer les outils **`computer_app_*`** (fenêtre en arrière-plan, sans déplacer la souris de
  l'utilisateur) : `computer_app_list_windows`, `computer_app_screenshot`, `computer_app_menu` (chemin de menu),
  `computer_app_click`, `computer_app_type`, `computer_app_key`. Toujours une capture fraîche avant de cliquer
  (coordonnées propres à la fenêtre).
- Les **panneaux Ouvrir / Enregistrer du Mac** appartiennent à un autre processus : outils écran (`computer_*`, accès
  complet), Cmd+Maj+G, coller le chemin, Retour, puis le bouton de validation.
- Plusieurs écrans : `computer_switch_display` si un dialogue s'ouvre sur l'autre écran.
- Après l'opération : capture de contrôle ; `computer_app_release` ; dire à l'utilisateur ce qui a été fait.

## Insérer un fichier LIÉ (image, PDF, BASE)
1. Le document cible au premier plan, la bonne planche affichée (par script : `createSetCurrentSpread`).
2. Barre d'outils contextuelle : décocher « Remplacer existant » (sinon le fichier remplit le cadre sélectionné).
3. `computer_app_menu` ["Fichier", "Insérer…"] → panneau Ouvrir : Cmd+Maj+G, chemin du fichier dans `Images/`,
   Retour, « Ouvrir » ; un clic sur la planche dépose le fichier (taille native).
4. Lié ou incorporé selon Fichier > Configuration du document > Placement des images (« Préférer lié » ; document
   créé par `creer_document.js` : lié). Contrôle : `inventaire_liens.js` (placement « lie »).
5. Caler exactement : `positionner.js` (l'objet inséré est sélectionné) avec la boîte cible d'un inventaire.

## Gestionnaire de ressources (Document > Gestionnaire de ressources…)
- Colonnes : Positionnement (Lié / Incorporé), État (OK / Manquant / Modifié), résolution effective.
- **Rendre liée une image incorporée** : la sélectionner > « Remplacer… » > choisir le MÊME fichier dans `Images/`
  (extrait au préalable par `extraire_ressources.js`). Éviter « Lier… » (crée un fichier sans extension « _1 »).
- **Rebrancher un dossier entier** : liens « Manquant » > « Rechercher… » > désigner une image du nouveau dossier :
  Affinity retrouve les autres (après avoir rendu l'ancien dossier introuvable si les liens y pointent encore).
- « Mettre à jour » après modification d'un fichier lié hors d'Affinity.

## Gestionnaire de polices (Document > Gestionnaire de polices…)
Police manquante sans texte visible (styles, caractères invisibles) : la sélectionner > « Remplacer » > police et
style. Fenêtre restée ouverte d'une session précédente : la refermer et la rouvrir (liste périmée).

## Maquettes
- **Modifier le contenu d'une instance sur une page** : sélectionner l'instance par script
  (`createSetSelection`), puis `computer_app_menu` ["Calque", "Maquette", "Modifier élément détaché"] (ou Maj+Cmd+D) ;
  lancer le script (sélection, suppression, déplacement vers la page) ; cliquer « Terminer » dans la barre de session.
  Une session par niveau d'instance ; toujours « Terminer » avant d'enregistrer.
- **Supprimer une maquette** : panneau Pages > section Maquettes > sélectionner > icône corbeille (vérifier avant
  qu'aucune page ne l'utilise : `inventaire_structure.js`).
- **Ajouter des pages** : Document > Pages > Ajouter une page ; depuis un autre fichier : Ajouter des pages depuis un
  fichier… (importe aussi ses maquettes).

## Préréglages d'export PDF (une fois par poste)
Fichier > Exporter > PDF > partir du préréglage indiqué > régler > menu ⌄ en haut à droite > « Créer un
préréglage… » > **nom exact** attendu par `projet.json` :
- « PDF Catalogue web » : base « PDF (numérique - haute qualité) », « PPP au-delà de » 150, Qualité 85.
- « PDF Fiches techniques web » : base haute qualité, « PPP au-delà de » 225, Qualité 85.
- Imprimeur : « PDF (Imprimerie) » existe déjà (fond perdu 3 mm, sans traits de coupe, images non réduites) ;
  « PDF Catalogue impression » si l'imprimeur demande des traits de coupe ou un profil précis.
Vérifier : `FileExportOptions.allPresetNames` (outil `ping.js`).

## Configuration du document (Fichier > Configuration du document…)
Vérifier après `creer_document.js` : Placement des images = Préférer lié ; profil de couleur ; fond perdu ; vis-à-vis.
Changer le profil d'un document existant : ici, « Assigner » (garde les valeurs) ou « Convertir » (selon l'imprimeur).

## Exécution de scripts
- Éditeur : Fenêtre > Exécution de scripts > Éditeur de script ; coller `lanceur.js` (cliquer d'abord dans la zone de
  texte), roue dentée > cocher « Système de fichiers », « Exécuter ».
- Bibliothèque : Fenêtre > Exécution de scripts > Bibliothèque ; un script de la bibliothèque s'exécute par
  double-clic / bouton Exécuter. Scripts installés : « Lanceur Claude », « Export publication », « Export par
  élément », « Appliquer les données » (voir `environnement.md`).
- Réglages (Affinity > Réglages > Exécution de scripts) : activer l'exécution, « Accéder au système de fichiers »,
  liste des dossiers autorisés (« Ajouter »). MCP : Réglages > MCP (accès Bureau, réseau, scripts enregistrés,
  enregistrement des scripts et des hints). Redémarrer Affinity après modification (avec l'accord de l'utilisateur).
