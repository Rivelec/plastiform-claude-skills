# À faire — {{NOM}} (projet créé le {{DATE}})

Règles : `CLAUDE.md`. Détail des changements : `CHANGELOG.md` (une section par fiche, avec sa version).

## Mise en place
- [ ] Polices du projet installées sur le poste (dossier `Fonts/`), aucune police manquante (`inventaire_polices.js`).
- [ ] Préréglage d'export présent sur le poste (voir `projet.json` > decoupage > prereglages).
- [ ] Dossier du projet autorisé dans Réglages > Exécution de scripts.
- [ ] BASE construite ; fichiers de langue avec la BASE liée sur chaque planche (`placer_base.js`).
- [ ] Images : 0 incorporée, 0 manquante, 0 calque pixel (`inventaire_liens.js`) ; 300 ppp effectifs.

## Contenu
- [ ] Textes {{LANGUE_REF}} validés (référence) ; valeurs techniques vérifiées à la source.
- [ ] Traductions relues (rapport par gravité, QCM des décisions, corrections appliquées).
- [ ] Pied de page de chaque fiche : même référence et même « Version X.Y » dans toutes les langues.

## Avant de publier une fiche
- [ ] Export par élément ; `verif_pdfs.py` sans CRITIQUE ni MAJEUR ; `diff_pdfs.py` avec la version précédente relu.
- [ ] Section de la fiche à jour dans le CHANGELOG ; publication déclarée par l'utilisateur
      (`projet.py publier <dossier> --element "<fiche>"`, ou `--tous`).
