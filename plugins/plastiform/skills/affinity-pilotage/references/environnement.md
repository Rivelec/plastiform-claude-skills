# Environnement : installation, réglages, déploiement

## Où sont les choses
| Élément | Mac | Shell (device_bash) |
|---|---|---|
| Dossier de travail Cowork | `/Users/tanguy.rivelec/Desktop/Cowork` | `$HOME/mnt/Cowork` |
| Outils | `…/Cowork/_Outils_Affinity` | `$HOME/mnt/Cowork/_Outils_Affinity` |
| Banc d'essai | `…/Cowork/_Banc_Affinity` (copies jetables) | `$HOME/mnt/Cowork/_Banc_Affinity` |
| Catalogue 2026 | `…/Cowork/Plastiform/Tarif/BRO_RIV_38-46_V1.0-CATALOGUE-2026` | idem sous `$HOME/mnt/Cowork` |
| Fiches techniques | `…/Cowork/Plastiform/Fiches Techniques/TEC_FTE_RIV_08-10-26` | idem |
| Copie de référence des outils | ce skill : `outils/` (archive à jour) | conteneur (dossier du plugin) |

Le dossier connecté peut porter un autre nom ou changer de place : `get_device_info` (connectedFolders) puis
adapter `config/chemins.env` (RACINE_MAC, RACINE_VM). Le chemin Mac des outils est aussi écrit en dur dans
`lanceur.js`, dans le lanceur inline du `SKILL.md` et dans les QUATRE entrées de la bibliothèque (`const O` des
fichiers `bibliotheque/*.js`) : tout mettre à jour ensemble, puis réenregistrer les entrées (§ Bibliothèque).

## Installation / mise à jour des outils sur le Mac
Depuis le conteneur (le skill contient `outils/`, copie complète et testée) :
```bash
cd <dossier du skill affinity-pilotage>/outils && N=outils_$(date +%H%M%S).tgz && \
  tar czf /mnt/user-data/outputs/$N --exclude=./run . && echo $N
```
puis `mcp__remote-devices__device_commit_files` : `stagedPath` = `/mnt/user-data/outputs/<N>`, `devicePath` =
`<RACINE_MAC>/_Outils_Affinity/_tmp/<N>` (**nom nouveau** : le remplacement d'un fichier existant est refusé en
silence), puis (device_bash) :
```bash
mkdir -p "$HOME/mnt/Cowork/_Outils_Affinity/_tmp"   # avant le commit, la 1re fois
cd "$HOME/mnt/Cowork/_Outils_Affinity" && tar --overwrite -xzf _tmp/<N> && mkdir -p run && chmod +x bin/*.sh && cat VERSION
```
`--overwrite` réécrit les fichiers en place (la suppression étant interdite, tar ne peut pas les remplacer
autrement). Les archives de `_tmp/` s'accumulent : les supprimer avec l'accord de l'utilisateur.
Contrôle : `bin/affinity_run.sh ping.js` + lanceur (MCP) → documents ouverts et préréglages.

## Réglages d'Affinity (une fois par poste — avec l'utilisateur)
- Affinity > Réglages > **Exécution de scripts** : exécution activée ; « Accéder au système de fichiers » ; dossiers
  autorisés : `_Outils_Affinity`, `_Banc_Affinity`, le dossier des projets (ex. `Cowork/Plastiform`) — sans eux,
  NOT_ALLOWED sur les fichiers.
- Affinity > Réglages > **MCP** : activé ; accès aux fichiers du Bureau, réseau, scripts enregistrés,
  enregistrement des scripts et des hints.
- Redémarrer Affinity après une modification des réglages (demander : l'utilisateur peut avoir des documents ouverts).
- Préréglages d'export : `interface.md` § Préréglages.

## Bibliothèque de scripts d'Affinity
Quatre entrées installées par `save_script_to_library` le 16/10/2026 (titres définitifs : une entrée ne se supprime
pas par script). Leur code est dans `outils/bibliotheque/` :
- « Lanceur Claude » (`lanceur_claude.js`) : `lanceur.js` + en-tête (exécute `run/current.txt`) — secours quand le
  MCP est indisponible ;
- « Export publication », « Export par élément », « Appliquer les données » (`export_publication.js`,
  `export_par_element.js`, `appliquer_donnees.js`) : **chargeurs** — ils copient la version à jour de
  `_Outils_Affinity/publication/<script>.js` sous `run/bib_<nom>_<horodatage>.js` (cache des modules), l'exécutent,
  puis effacent la copie. Mettre à jour les outils suffit ; les entrées ne changent que si le chemin des outils change.
Sans document du projet ouvert, chacun s'arrête aussitôt sur « Aucun projet trouvé » (essai sans risque).
Réinstaller sur un autre poste : `list_library_scripts` (éviter les doublons), adapter le chemin `O` des quatre
fichiers, puis `save_script_to_library` (titre, description, code). Les projets gardent aussi une copie autonome des
scripts dans `Scripts/` (utilisable sans les outils).

## Contraintes du shell du Mac (device_bash)
- Pas de suppression dans les dossiers connectés sans autorisation explicite (`device_request_delete_permission`,
  par dossier racine connecté). Conséquences dans les outils : fichiers temporaires dans `/tmp`, écriture en place,
  `mv` à l'intérieur d'un même dossier (autorisé), `rm` toléré en échec.
- Réseau limité (liste blanche) ; Python 3 avec Pillow, numpy, pikepdf, openpyxl ; ImageMagick 6 (`convert`,
  `identify`, `montage`) ; poppler (`pdfinfo`, `pdffonts`, `pdfimages`, `pdftotext`, `pdftoppm`) ; qpdf ; gs ;
  tesseract ; libreoffice ; node. Pas de zbarimg ni d'exiftool.
- 120 s par commande par défaut (max 180 s) : découper les traitements longs (un PDF à la fois…).

## Banc d'essai `_Banc_Affinity`
Copies jetables pour essayer avant d'agir sur un vrai projet :
```bash
S="$HOME/mnt/Cowork/Plastiform/…/PROJET"; D="$HOME/mnt/Cowork/_Banc_Affinity/projet"; mkdir -p "$D"
cp -p "$S"/*.af "$D/" && cp -Rp "$S/Images" "$D/"   # + projet.json / données si besoin
```
Les liens d'une copie peuvent encore pointer vers l'original (chemin absolu) : sans conséquence en lecture ; ne
jamais enregistrer la BASE originale depuis le banc. Faire le ménage du banc avec l'accord de l'utilisateur.
