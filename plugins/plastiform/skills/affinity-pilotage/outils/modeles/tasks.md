# À faire avant de publier {{NOM}} (cycle « non publiée » ouvert le {{DATE}})

Règles : `CLAUDE.md`. Détail des changements : `CHANGELOG.md`.

## Mise en place
- [ ] Polices du projet installées sur le poste (dossier `Fonts/`), aucune police manquante (`inventaire_polices.js`).
- [ ] Préréglages d'export présents sur le poste (voir `projet.json` > supports > prereglages).
- [ ] Dossier du projet autorisé dans Réglages > Exécution de scripts.
- [ ] BASE construite ; fichiers de langue avec la BASE liée sur chaque planche (`placer_base.js`).
- [ ] Images : 0 incorporée, 0 manquante, 0 calque pixel (`inventaire_liens.js`) ; 300 ppp effectifs.

## Contenu
- [ ] Textes {{LANGUE_REF}} validés (référence).
- [ ] Traductions relues (rapport par gravité, QCM des décisions, corrections appliquées).
- [ ] Données communes vérifiées à la source.

## Avant publication
- [ ] Export complet ; `verif_pdfs.py` sans CRITIQUE ni MAJEUR ; `diff_pdfs.py` avec la version précédente relu.
- [ ] CHANGELOG à jour ; publication déclarée par l'utilisateur (`projet.py publier`).
