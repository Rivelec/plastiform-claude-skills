# _Outils_Affinity — boîte à outils Affinity de Claude

Outils communs à tous les projets Affinity (catalogue, fiches techniques, brochures…). Installés et mis à jour par
Claude depuis le plugin Plastiform (skill `affinity-pilotage`, dossier `outils/`). Version : voir `VERSION`.

## Pour l'utilisateur (sans Claude)
Trois scripts sont dans la **bibliothèque de scripts** d'Affinity (Fenêtre > Exécution de scripts > Bibliothèque),
plus « Lanceur Claude », qui ne sert que lorsque Claude le demande :
- **Export publication** : exporte toutes les versions PDF d'un catalogue / d'une brochure (langues × variantes ×
  supports) d'après le `projet.json` du projet. Ouvrir d'abord un fichier du projet, puis exécuter.
- **Export par élément** : un PDF par fiche technique et par langue.
- **Appliquer les données** : reporte les prix (`tarifs.json` ou fichier de données du projet) dans toutes les
  langues. Puis relancer l'export.
Chaque projet en garde aussi une copie dans son dossier `Scripts/` (pour un autre poste). Prérequis : Réglages >
Exécution de scripts : exécution activée, « Accéder au système de fichiers », dossier du projet autorisé.

## Contenu
| Dossier | Contenu |
|---|---|
| `affinity/` | scripts de travail exécutés dans Affinity par Claude (inventaires, rendus, corrections, polices, BASE, images, compactage…) |
| `publication/` | scripts autonomes de publication (aussi dans la bibliothèque d'Affinity) |
| `lib/affinity_lib.js` | bibliothèque commune des scripts de travail |
| `python/` | contrôles et rapports exécutés sur le Mac (PDF, rendus, projet, langues, QCM, images, données) |
| `bin/` | lancement (`affinity_run.sh`, `affinity_wait.sh`), chemins, compactage |
| `modeles/` | modèles de projet (`projet.json`, CLAUDE.md, LISEZMOI, CHANGELOG, tasks, page QCM) |
| `config/chemins.env` | chemins du Mac et de la machine de Claude |
| `bibliotheque/` | code des 4 entrées de la bibliothèque de scripts d'Affinity (les 3 scripts ci-dessus chargent la version à jour de `publication/`) |
| `run/` | fichiers de travail (copies des scripts, paramètres, comptes rendus, inventaires) — peut être vidé |
| `lanceur.js` | lanceur (aussi « Lanceur Claude » dans la bibliothèque) : exécute les scripts préparés par Claude |

## Pour Claude
Mode d'emploi complet : skill `affinity-pilotage` (procédure « Exécuter un outil », règles de sécurité) et sa
référence `outils.md` (paramètres de chaque outil). En bref :
```bash
O="$HOME/mnt/Cowork/_Outils_Affinity"
"$O/bin/affinity_run.sh" inventaire_liens.js '{"docs": ["/Users/…/FR.af"]}'   # ou --suite run/_suite.json
# → MCP execute_script avec le contenu de lanceur.js ; au-delà de 60 s : "$O/bin/affinity_wait.sh" 170
#   (appel device_bash avec timeout_ms: 180000 ; sinon "$O/bin/affinity_wait.sh" seul, 110 s au plus)
python3 "$O/python/verif_pdfs.py" <PDF…> --projet <projet>/projet.json
```
Ne pas modifier ces fichiers à la main : les modifier dans le plugin (skill `affinity-pilotage/outils/`) puis
redéployer, pour que la copie de référence reste à jour.
