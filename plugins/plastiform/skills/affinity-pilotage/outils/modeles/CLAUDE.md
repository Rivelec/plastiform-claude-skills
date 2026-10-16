# {{NOM}} ({{PREFIXE}}) — règles de travail

Projet Affinity multilingue créé le {{DATE}} avec `_Outils_Affinity` (skills Plastiform `affinity-*`).
Structure : `{{BASE}}` (tout ce qui est commun aux langues, images liées depuis `Images/`) + un fichier par langue
({{FICHIERS_LANGUES}}) qui place la BASE en lien sous chaque planche. Langue de référence des textes : {{LANGUE_REF}}.
Paramètres : `projet.json` ({{PARAMETRES}}). Voir `LISEZMOI.txt`.

## Règles
1. Tout ce qui est identique dans toutes les langues va dans la BASE ; un texte de langue ne va jamais dans la BASE.
2. Aucune image incorporée : tout est lié depuis `Images/` (SVG et PDF compris). Contrôle : `inventaire_liens.js`
   (0 incorporée, 0 manquante) ou Document > Gestionnaire de ressources, colonne « Positionnement » = Lié.
   Ne jamais renommer ni déplacer un fichier de `Images/` (lien cassé).
3. Images : 300 ppp effectifs à leur plus grande taille d'utilisation, taille physique conservée (`optimiser_images.py`).
4. Aucun calque pixel peint : un visuel retouché est exporté dans `Images/` puis placé lié.
{{REGLE_VERSIONS}}
{{REGLE_DONNEES}}
7. Ne jamais enregistrer un fichier de langue pendant un export ; un seul gros document ouvert à la fois.
8. Avant toute opération de masse : rendus PNG « avant » (`rendre_pages.js`), opération en simulation, application,
   rendus « après », `comparer_rendus.py`. Les outils qui modifient un document l'enregistrent en le compactant ;
   un document enregistré autrement par script se compacte avec `compacter.js`.
9. Relectures : rapport par gravité (CRITIQUE / MAJEUR / MINEUR), décisions de l'utilisateur par QCM (`qcm.py`),
   corrections en règles JSON appliquées par `corrections_textes.js` (simulation puis application).

## Pièges Affinity propres à ce projet
- (à compléter au fil du travail : date, constat, contournement)
