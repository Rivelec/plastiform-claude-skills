---
name: publication-export-version
description: "Exporte et versionne une publication Affinity par script : toutes les déclinaisons ou un PDF par fiche, référence et titres justes, montée de version, CHANGELOG, contrôle et diff des PDF. Pour « exporte », « sors les PDF », « nouvelle version », « on publie », un envoi à l'imprimeur."
---

# Exports, versions et changelog

Tout passe par `projet.json` (ou l'ancien `catalogue.json`) et les scripts de publication : jamais d'export à la
main (oublis de variante, mauvaise référence imprimée, mauvais titre de PDF — cas réels corrigés en octobre 2026).

Prérequis : `affinity-pilotage`. Paramètres de `projet.json` : `references/projet-json.md`.

## 1. Avant d'exporter
- `projet.py etat <dossier>` : version(s), état, documents modifiés après les derniers PDF, verrous.
- Documents de langue **enregistrés**. `export_publication.js` IGNORE une langue ouverte avec des modifications non
  enregistrées (il la refermerait : modifications perdues ; un fichier de langue ouvert à la main est souvent marqué
  « modifié » à cause du lien vers la BASE : faire enregistrer, ou lancer depuis la BASE). `export_par_element.js`
  exporte un document déjà ouvert TEL QU'IL EST AFFICHÉ (modifications non enregistrées comprises) et le laisse
  ouvert : s'assurer qu'il est enregistré pour que le PDF corresponde au fichier. Aucun export n'enregistre.
- Changement de contenu depuis la dernière publication ? → version (§ 2) avant l'export.
- Données centralisées modifiées ? → `appliquer_donnees.js` d'abord (skill `affinity-donnees-centralisees`).
- Préréglages présents sur le poste (`ping.js` les liste ; sinon `interface.md` § Préréglages).

## 2. Version et CHANGELOG (règles Rivelec)
```bash
O="$HOME/mnt/Cowork/_Outils_Affinity"; P="$HOME/mnt/Cowork/<chemin du projet>"
python3 "$O/python/projet.py" etat "$P"
```
**Catalogue, brochure (une version pour tout le document, dans `projet.json`)**
- Une seule montée par cycle non publié : `projet.py version "$P"` (refuse si la version courante n'est pas
  publiée ; `--forcer` seulement sur demande explicite). X.Y → X.(Y+1) par défaut, X+1.0 sur demande. L'export
  imprime la nouvelle référence et nomme les fichiers d'après elle.
- Chaque changement : `projet.py noter "$P" "p. 36 (F20) : 60,00 € → 61,00 €" --rubrique "Tarifs"`. Quoi, où,
  avant → après, source.
- Publication déclarée par l'utilisateur seulement : `projet.py publier "$P"`.

**Fiches techniques (mode « éléments » : une version PAR fiche, imprimée sur la fiche)**
- Ouvrir le cycle d'une fiche : `projet.py version "$P" --element "F20"` (plusieurs : `"F20,M25"` ; toutes :
  `--tous`) → `### Non publiée – Version 2.1` (dernière publiée +0.1 ; refusé si un cycle est déjà ouvert).
- Reporter la version sur la fiche, dans CHAQUE langue : pied de page « Version 2.0 » → « Version 2.1 »
  (« Versión » en ES) avec `corrections_textes.js`, règle limitée aux pages de la fiche (`"pages"` ou `"s"`) et
  `"attendu"` (simulation puis application) — `export_par_element.js` nomme le PDF d'après ce texte imprimé.
- Chaque changement : `projet.py noter "$P" "…" --element "F20"` (refusé si la version de la fiche est publiée :
  ouvrir d'abord le cycle). Changement commun : sans `--element` (section « Changements communs »).
- Publication déclarée par l'utilisateur seulement : `projet.py publier "$P" --element "F20"` (ou `--tous`).
- Projet sans `projet.json` (fiches 2026) : `projet.py` ne s'applique pas tant qu'il n'est pas créé
  (`conventions-rivelec.md`) ; tenir alors le CHANGELOG à la main, au même format.

## 3. Exporter
Par Claude (paramètres facultatifs : sous-ensemble, dossier de sortie d'essai) :
```bash
O="$HOME/mnt/Cowork/_Outils_Affinity"
"$O/bin/affinity_run.sh" export_publication.js '{"dossier": "<Mac>/<projet>/"}'      # tout
"$O/bin/affinity_run.sh" export_publication.js '{"dossier": "<Mac>/<projet>/", "langues": ["FR"], "variantes": ["AP"], "supports": ["WEB"]}'
"$O/bin/affinity_run.sh" export_par_element.js '{"dossier": "<Mac>/<fiches>/", "langues": ["FR", "EN"]}'
```
puis le lanceur (MCP) et `"$O/bin/affinity_wait.sh" 170` (device_bash, `timeout_ms: 180000`) jusqu'à la fin
(1 à 3 min par PDF de 56 pages ; ~10 s par fiche ;
catalogue complet ~17-25 min : prévenir l'utilisateur qu'Affinity est occupé). Par l'utilisateur seul :
bibliothèque de scripts « Export publication » / « Export par élément », document du projet ouvert.
Ce que fait l'export : pour chaque langue, ouverture sans enregistrement, chargement des liens et polices, pour chaque
variante éléments affichés/masqués et référence imprimée posée, pour chaque support le 1er préréglage existant,
titre/sujet/auteur du PDF, journal `export_log.txt`, fichier refermé (rouvert s'il l'était).

## 4. Contrôler (toujours, avant de livrer)
```bash
O="$HOME/mnt/Cowork/_Outils_Affinity"; P="$HOME/mnt/Cowork/<chemin du projet>"
python3 "$O/python/verif_pdfs.py" "$P/EXPORTS" --projet "$P/projet.json" --md "$P/_travail/verif.md"
python3 "$O/python/diff_pdfs.py" "<anciens PDF>" "$P/EXPORTS" --visuel --md "$P/_travail/differences.md"
```
(fiches : `"$P/PDF/Fiches"` ; les dossiers de rapport sont créés au besoin.)
- `verif_pdfs.py` : structure, nombre de pages, fond perdu par support, polices incorporées, images sous le seuil,
  référence du nom de fichier imprimée (et aucune autre), titre, textes requis/interdits par variante (ex. « € »
  présent en AP, absent en SP), notes oubliées (« A SUPPRIMER », « ??? », TODO). 0 CRITIQUE et 0 MAJEUR avant de
  livrer (sinon expliquer chaque point).
- `diff_pdfs.py` (anciens PDF : version précédente, publiée) : seules les modifications voulues doivent apparaître ;
  pages « visuel » = image ou mise en page changée sans texte ; son brouillon alimente le CHANGELOG (à reformuler).
- Coup d'œil aux pages modifiées (rendus `pdftoppm`) ; pour un envoi important, revue indépendante (skill
  `revue-pdf`, agent `relecteur-independant`).

## 5. Alléger les PDF écran (facultatif)
Les images d'une BASE liée ne sont pas réduites par Affinity : `python3 "$O/python/compresser_pdf.py" "$P"/EXPORTS/WEB_*.pdf --ppp 150`
(ex. 30 → 9 Mo, métadonnées gardées ; écrit `…_compresse.pdf`, `--remplacer` pour écraser). Jamais pour les PDF
imprimeur. Contrôle : `diff_pdfs.py original compressé --visuel` (l'ordre du texte extrait peut changer ; regarder
les rendus).

## 6. Livrer et noter
- Résumé : PDF produits (nombre, tailles), contrôles (0 CRITIQUE…), différences avec la version précédente.
- CHANGELOG à jour ; `tasks.md` (reste à faire) ; les anciens PDF d'une autre version : ne pas les supprimer sans
  accord (les déplacer dans un sous-dossier daté).
- Publication déclarée par l'utilisateur → `projet.py publier` (fiches : `--element` / `--tous`).

## Dépannage
- « aucun projet trouvé » : passer `"dossier"` ou ouvrir un document du projet ; `projet.json` dans le dossier du
  document ou un niveau au-dessus.
- « référence introuvable » : le motif `reference.motif` ne correspond à aucun texte (référence imprimée absente ou
  écrite autrement).
- « préréglage » absent : créer le préréglage (nom exact) ou ajouter un repli dans `supports.<S>.prereglages`.
- PDF flou ou police de secours : export trop tôt après ouverture (l'échauffement est automatique ; relancer).
- 1re page d'une fiche sans la BASE : `decoupage.page_precedente` doit inclure ce produit.
