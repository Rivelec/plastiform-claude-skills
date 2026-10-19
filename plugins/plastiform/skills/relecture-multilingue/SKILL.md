---
name: relecture-multilingue
description: "Relit les traductions d'un document Affinity contre le français : alignement, nombres, lexique et termes proscrits, non-traduits, rapport par gravité, QCM de décision puis application. Pour relire ou valider une traduction, vérifier la terminologie ou appliquer les retours d'un traducteur."
---

# Relecture multilingue

Le français est la référence : chaque langue doit dire la même chose (mêmes données, mêmes renvois, même sens),
avec la terminologie validée. On fait d'abord tout ce qui est mécanique (outils), puis la relecture linguistique
(Claude), puis les décisions (utilisateur), puis l'application (règles).

Prérequis : `affinity-pilotage` (outils, lanceur) ; `affinity-textes-langues` pour appliquer.

## 1. Extraire et aligner
```json
[["inventaire_textes.js", {"doc": "<Mac>/FR.af", "sortie": "<Mac>/<projet>/_travail/textes_FR.json"}],
 ["inventaire_textes.js", {"doc": "<Mac>/DE.af", "sortie": "<Mac>/<projet>/_travail/textes_DE.json"}],
 ["textes_debordants.js", {"doc": "<Mac>/DE.af", "sortie": "<Mac>/<projet>/_travail/debordants_DE.json"}]]
```
```bash
O="$HOME/mnt/Cowork/_Outils_Affinity"; P="$HOME/mnt/Cowork/<chemin du projet>"; T="$P/_travail"
python3 "$O/python/aligner_langues.py" "$T/textes_FR.json" "$T/textes_DE.json" \
  --lexique "<lexique.xlsx>" --langue DE --proscrits "<lexique.xlsx>:2" \
  --md "$T/alignement_DE.md" --json "$T/alignement_DE.json" --qcm "$T/qcm_DE.json"
```
(`_travail/` est créé au besoin par les outils ; chemins absolus : chaque appel device_bash est un shell neuf.)
Appariement : même planche et même objet, sinon objet le plus proche départagé par les codes (AC-011…). Signale :
non traduit, **nombres différents** (prix, valeurs, « voir page 50 » / « Seite 46 »), blocs sans équivalent, texte
nettement plus long (débordement probable), écarts au lexique (regroupés par terme ; MAJEUR s'ils touchent un titre
ou un libellé), termes proscrits. Les pages où la langue a été adaptée (objets propres à la langue) produisent des
appariements douteux : les vérifier au rendu.

## 2. Relecture linguistique (Claude)
Pour chaque bloc apparié (ou les blocs signalés, selon le volume), comparer FR ↔ cible : sens complet (rien
d'omis, rien d'ajouté), données identiques, terminologie (lexique, profil Rivelec : « Manual Putty », « Curing time »,
Maßabdruck, Mischdüse…), registre technique, grammaire, typographie de la langue, cohérence d'un bloc à l'autre (un
même terme FR toujours traduit pareil). Ne pas réécrire ce qui est juste ; ne pas inventer de données produit.
Grands volumes : par lots de pages, en notant au fur et à mesure (fichier JSON de constats).

## 3. Rapport et décisions
- Rapport par gravité (`_travail/RELECTURE_<LANGUE>_<date>.md`) :
  **CRITIQUE** contresens, donnée ou sécurité fausse, prix ou renvoi erroné ; **MAJEUR** omission, terminologie non
  conforme, texte coupé, non traduit ; **MINEUR** style, typographie, fluidité. Pour chaque point : page, FR, actuel,
  proposition, justification.
- Décisions : questions au format de `qcm.py` (une par point qui demande un choix : propositions + « garder » +
  « autre », recommandation, contextes FR / EN validé / cible avec le passage en ⟦…⟧, règle de remplacement prête :
  `"regle": {"f": "<texte actuel exact>", "s": <planche>, "exact": 1}` ou un extrait unique) ; le squelette
  `qcm_<LANGUE>.json` produit par l'alignement sert de départ (règle `exact` sur le texte complet du bloc ; pour un
  tableau, pas de règle : la cellule à corriger est à préciser à la main). `qcm.py generer` → page HTML ; la publier en
  artefact (lien privé à transmettre au relecteur natif) ou l'envoyer en fichier. Points déjà tranchés (lexique
  validé) : section « valides » de la page, appliqués sans question.
- Les corrections évidentes (coquilles, typographie) n'ont pas besoin du QCM : règles directes, montrées en
  simulation.

## 4. Appliquer
1. Réponses (fichier téléchargé ou texte copié par l'utilisateur) → `python3 "$O/python/qcm.py" regles
   "$T/qcm_DE.json" "<reponses.txt>" "$T/post_DE.json"` ; points sans règle : à traiter à la main (signalés).
2. `corrections_textes.js` simulation (chaque règle trouvée le bon nombre de fois : `attendu`), puis application,
   rendus avant/après, `textes_debordants.js` (le nouveau texte tient-il ?).
3. Nouvelle passe d'`aligner_langues.py` : les points corrigés disparaissent ; CHANGELOG par langue (« DE-001 à
   DE-154 appliqués »), `tasks.md` (relecture native restante), réexport.

## Lexiques
- Format accepté : xlsx (1re feuille, colonne du français et colonne de la langue cible repérées par l'en-tête :
  « Français (FR) », « Allemand – Validé Plastiform (DE) » ; `--col-source` / `--col-cible` sinon), csv, json
  `[{source, cible}]`. « A / B » = variantes admises ; « (s) », « (n) », articles ignorés.
- Termes proscrits : feuille dont un en-tête contient « proscrire » (terme interdit) et un autre « validé » /
  « standard » (remplacement) — `--proscrits fichier.xlsx:2`. Une règle dont le terme proscrit figure dans le terme
  validé (« Mischdüsen » → « Spezial-Mischdüsen ») dépend du contexte : signalée MINEUR.
- Profil Rivelec : `Lexique_Allemand_catalogues_supports_DEFINITIF_12-10-26.xlsx` (dossier des fiches techniques) ;
  en créer un par langue au fil des relectures validées (même format), et le citer dans le `CLAUDE.md` du projet.
