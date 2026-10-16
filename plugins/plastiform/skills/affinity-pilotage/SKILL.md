---
name: affinity-pilotage
description: "Socle pour piloter Affinity (by Canva) depuis Claude : MCP, lanceur, boîte à outils _Outils_Affinity, SDK, pièges vérifiés. À charger dès qu'une tâche touche un fichier .af/.afpackage, un catalogue, une fiche technique ou une brochure Affinity, même sans demande de script."
---

# Piloter Affinity

Affinity tourne sur le Mac de l'utilisateur ; Claude y agit par trois canaux, dans cet ordre de préférence :

1. **MCP Affinity** (`mcp__remote-devices__Affinity__*`) : exécuter du JavaScript du SDK, lire la documentation et
   les « hints », enregistrer des scripts dans la bibliothèque d'Affinity. Rapide, invisible pour l'utilisateur.
2. **Boîte à outils `_Outils_Affinity`** sur le Mac (scripts testés, voir `references/outils.md`), lancée par le MCP
   au moyen du **lanceur** (ci-dessous). C'est la voie normale : elle évite de réécrire du code et garde un journal.
3. **Interface** (computer use, outils `computer_app_*` en arrière-plan) pour ce que le SDK ne sait pas faire :
   insérer un fichier lié, « Remplacer » dans le Gestionnaire de ressources, supprimer une maquette, créer un
   préréglage d'export, mode « Modifier élément détaché »… Voir `references/interface.md`.

Le shell du Mac (`mcp__remote-devices__device_bash`) sert aux outils Python (contrôles, comparaisons, rapports) et à
préparer les scripts ; les dossiers connectés y sont sous `$HOME/mnt/<dossier>` (ici `$HOME/mnt/Cowork`).
**Chaque appel device_bash est un shell neuf** (ni variables ni dossier courant conservés) : dans tous les skills,
commencer chaque commande par `O="$HOME/mnt/Cowork/_Outils_Affinity"` (outils) et, si besoin, `P="<dossier du projet
côté shell>"`, puis n'utiliser que des chemins absolus. Délai : 120 s par défaut, jusqu'à 180 s avec `timeout_ms`.

## Avant de commencer

- **Lire le préambule du MCP** (`read_sdk_documentation_topic` « preamble ») une fois par session : le MCP refuse
  d'exécuter tant qu'il n'est pas lu, et il contient les « hints » des sessions précédentes. Chercher dans
  `search_sdk_hints` avant d'expérimenter ; après une découverte vérifiée, `add_sdk_hint`.
- Vérifier que les outils sont là : `ls "$HOME/mnt/Cowork/_Outils_Affinity"` (device_bash). Absents ou périmés
  (`VERSION` plus ancien que celle du skill) : les installer, `references/environnement.md` § Installation.
- Savoir quels documents sont ouverts : outil `documents.js` (ou `Document.all` par le MCP). **Ne jamais fermer ni
  enregistrer un document que l'utilisateur a ouvert et modifié** (`isDirty`) sans le lui demander.
- Chemins : Affinity voit les chemins du Mac (`/Users/tanguy.rivelec/Desktop/Cowork/…`), le shell les voit sous
  `$HOME/mnt/Cowork/…`. Conversion : `bin/chemins.sh mac|vm <chemin>` (d'après `config/chemins.env`).

## Exécuter un outil (procédure standard)

1. Préparer (device_bash) — un script, ou une suite de scripts exécutés l'un après l'autre :
   ```bash
   O="$HOME/mnt/Cowork/_Outils_Affinity"
   "$O/bin/affinity_run.sh" inventaire_liens.js '{"docs":["/Users/tanguy.rivelec/Desktop/Cowork/…/FR.af"]}'
   # ou : "$O/bin/affinity_run.sh" --suite run/_suite.json   (chemin relatif aux outils, ou absolu) contenant
   #      [["rendre_pages.js", {…}], ["documents.js", {}]]
   ```
2. Exécuter : appeler `mcp__remote-devices__Affinity__execute_script` avec **exactement** ce lanceur (contenu de
   `lanceur.js` ; il exécute chaque ligne de `run/current.txt`) :
   ```js
   const fs = require('/fs.js'), O = '/Users/tanguy.rivelec/Desktop/Cowork/_Outils_Affinity/'; let cible = ''; try { const u = new Uint8Array(fs.File.readAll(O + 'run/current.txt').buffer); let s = ''; for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode.apply(null, u.subarray(i, i + 32768)); for (cible of decodeURIComponent(escape(s)).split('\n').map(x => x.trim()).filter(Boolean)) require(cible); } catch (e) { try { const f = fs.File.create(O + 'run/out_run.txt', 'ab'); f.writeStringAsUtf8('ERREUR ' + cible + '\n' + e + '\n' + (e.stack || '') + '\nFIN\n'); f.close(); } catch (e2) { } console.log('ERREUR ' + e); }
   ```
   Le compte rendu revient dans la réponse du MCP. **Au-delà de 60 s le MCP rend la main sans résultat** alors que
   le script continue : ne PAS relancer ; lire la suite avec `O=…; "$O/bin/affinity_wait.sh" 170` (device_bash avec
   `timeout_ms: 180000` ; sans `timeout_ms`, 110 s au plus), autant de fois que nécessaire (il attend une ligne `FIN`
   par script préparé).
3. Gros résultats : fichiers JSON (chemins indiqués dans le compte rendu), à lire avec Python côté shell.

Sans MCP (désactivé, injoignable) : à l'étape 2, l'utilisateur exécute « Lanceur Claude » dans Fenêtre > Exécution
de scripts > Bibliothèque (installé ; à défaut, coller `lanceur.js` dans l'éditeur de script) ; la suite est
identique (`affinity_wait.sh`).

Pourquoi des copies uniques : Affinity met les modules en cache par chemin ; `affinity_run.sh` copie chaque script
et la bibliothèque `lib/affinity_lib.js` sous un nom neuf et y écrit les paramètres. Ne jamais `require()` deux fois
le même fichier modifié.

## Écrire un script ponctuel

Pour une opération que la boîte à outils ne couvre pas, écrire un script dans `run/` (ou l'envoyer directement par
`execute_script` s'il est court) en s'appuyant sur la bibliothèque :

```js
const L = require('__OUTILS__lib/affinity_lib.js');   // affinity_run.sh remplace __OUTILS__
L.job(A => {                                           // A = paramètres JSON ; exceptions journalisées ; FIN écrit
  const doc = L.ouvrir(A.doc);
  for (const t of L.textes(doc)) if (/Recommanded/.test(t.texte)) L.log('p' + t.page + ' ' + t.texte.slice(0, 60));
});
```
Fonctions disponibles et règles du SDK : `references/api-sdk.md`. Un script réutilisable rejoint `affinity/` avec
un en-tête (rôle, paramètres, résultat) ; une découverte du SDK rejoint `references/pieges.md` et un hint MCP.

## Règles de sécurité (toujours)

1. **Banc d'essai d'abord** pour toute opération nouvelle ou de masse : copie dans `Cowork/_Banc_Affinity/`
   (`cp -p` des .af + Images/) ; on n'essaie jamais une première fois sur le fichier de l'utilisateur.
2. **Simulation puis application** : `corrections_textes`, `remplacer_polices`, `placer_base` sont en simulation par
   défaut (`"mode": "application"` pour appliquer) ; `appliquer_donnees` APPLIQUE par défaut (c'est le comportement de
   l'entrée de bibliothèque) : lui passer `{"simulation": true}` d'abord. Montrer le résultat avant d'appliquer. Ces
   outils refusent d'appliquer sur un `.afpackage` (enregistrement par script risqué) et sur un document ouvert par
   l'utilisateur avec des modifications non enregistrées (lui demander Cmd+S).
3. **Rendus avant / après** : `rendre_pages.js` avant, opération, `rendre_pages.js` après, puis
   `python3 "$O/python/comparer_rendus.py" <avant>/ <après>/ --html <projet>/_travail/comparaison.html` ; regarder
   les pages signalées.
4. **Un seul gros document ouvert à la fois** ; jamais d'enregistrement pendant un export. `doc.save()` par script
   ajoute au fichier (il grossit) : les outils qui modifient un document qu'ils ont ouvert l'enregistrent compacté
   (`L.enregistrerCompact`) ; un document enregistré autrement se compacte avec `compacter.js` puis
   `bin/compacter_finaliser.sh` (documents fermés).
5. **Ne rien supprimer** chez l'utilisateur sans accord : le shell du Mac n'a pas le droit de supprimer dans les
   dossiers connectés (« Operation not permitted ») — c'est voulu. Déplacer dans `_a_supprimer/` ou demander
   l'autorisation (`device_request_delete_permission`) en expliquant pourquoi.
6. **Interface** : prévenir l'utilisateur avant de prendre la main sur l'écran ; préférer les outils `computer_app_*`
   (arrière-plan) ; ne jamais appuyer sur Échap pendant qu'il travaille ; une boîte de dialogue inattendue bloque les
   scripts — faire une capture (`computer_app_screenshot`) si un script ne rend pas la main.
7. Profil Rivelec : ne jamais toucher aux dossiers de sauvegarde (ex. `Plastiform/Tarif/1 - Tarifs`), aux originaux
   déclarés intouchables dans le `CLAUDE.md` du projet, ni aux dossiers personnels de Cowork. `references/conventions-rivelec.md`.

## Choisir l'outil

| Besoin | Outil (affinity/ = dans Affinity, python/ = shell) |
|---|---|
| Structure : planches, calques, BASE par planche, maquettes | `inventaire_structure.js` |
| Images : liées / incorporées / manquantes, ppp effectifs, calques pixel | `inventaire_liens.js` |
| Polices utilisées / absentes | `inventaire_polices.js` → `remplacer_polices.js` |
| Tous les textes (position, calques, cellules) | `inventaire_textes.js` |
| Textes qui débordent de leur cadre | `textes_debordants.js` |
| Rechercher / remplacer en gardant la mise en forme | `corrections_textes.js` (règles JSON, `**gras**`) |
| Rendus PNG de contrôle | `rendre_pages.js` + `python/comparer_rendus.py` |
| Placer la BASE liée sur toutes les planches | `placer_base.js` |
| Créer un document (images liées par défaut) | `creer_document.js` |
| Images incorporées → fichiers ; calques pixel → fichiers | `extraire_ressources.js` ; `extraire_pixels.js` + `python/pixels_vers_fichiers.py` |
| Placer une image à une position ; ajuster l'objet sélectionné | `placer_image.js` ; `positionner.js` |
| Données répétées (prix) → JSON → toutes les langues | `donnees_extraire.js` ; `publication/appliquer_donnees.js` |
| Exports PDF (versions, variantes, par élément) | `publication/export_publication.js`, `export_par_element.js` |
| Ouvrir / fermer / enregistrer / lister | `documents.js` ; compacter : `compacter.js` |
| Contrôle des PDF, différences, compression | `python/verif_pdfs.py`, `diff_pdfs.py`, `compresser_pdf.py` |
| Projet (création, version, CHANGELOG, état) | `python/projet.py` |
| Bilan de santé, alignement des langues, QCM | `python/bilan_sante.py`, `aligner_langues.py`, `qcm.py` |

Paramètres et exemples de chaque outil : `references/outils.md`. Tâches complètes : skills `affinity-nouveau-projet`,
`affinity-migration`, `affinity-sante-projet`, `affinity-textes-langues`, `affinity-donnees-centralisees`,
`publication-export-version`, `revue-pdf`, `relecture-multilingue`.

## Références (à lire selon le besoin)

- `references/outils.md` — catalogue complet des outils : paramètres, sorties, exemples, durées.
- `references/api-sdk.md` — SDK : documents, nœuds, sélection, textes, tableaux, objets épinglés, maquettes, images,
  export, polices, création ; à lire avant d'écrire un script.
- `references/pieges.md` — pièges vérifiés et contournements (classés par thème). À relire en cas de comportement
  étrange : la réponse y est souvent.
- `references/interface.md` — opérations par l'interface : menus, Gestionnaire de ressources, Pages, préréglages,
  éditeur de script, bibliothèque, sessions « détaché ».
- `references/environnement.md` — installation, réglages d'Affinity, dossiers autorisés, MCP, chemins, déploiement
  des outils depuis le conteneur, contraintes de suppression.
- `references/conventions-rivelec.md` — profil Rivelec / Plastiform : nommage, versions, CHANGELOG, langues,
  terminologie, sources de données, rapports et QCM.
