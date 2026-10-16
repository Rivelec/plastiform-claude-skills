#!/bin/bash
# affinity_run.sh — prépare l'exécution d'un ou plusieurs scripts de travail dans Affinity, par le lanceur global.
#
# Usage : affinity_run.sh <script.js> ['<paramètres JSON>']
#         affinity_run.sh --suite <fichier.json>     (fichier : [["script.js", {paramètres}], …], exécutés à la suite ;
#                                                    chemin absolu, relatif au dossier courant ou aux outils : run/_suite.json)
#   <script.js>  chemin d'un fichier, ou nom d'un script de affinity/ ou de publication/ (ex. inventaire_liens.js)
#   paramètres   objet JSON lu dans le script par L.args() ; les chemins de documents sont des chemins du Mac
#                (convertir avec bin/chemins.sh mac <chemin VM>).
# Ensuite : exécuter le lanceur — par l'outil MCP execute_script (code : lanceur.js) ou, sans MCP, entrée « Lanceur
#           Claude » de la bibliothèque de scripts d'Affinity — puis bin/affinity_wait.sh pour lire le compte rendu
#           (run/out_run.txt : une ligne « FIN » par script terminé). Mode d'emploi : skill affinity-pilotage.
#
# Affinity garde les modules en cache par chemin : chaque script ET la bibliothèque sont copiés sous un nom unique
# (run/x_<nom>_<n>.js, run/lib_<n>.js) avec leurs paramètres (run/args_<n>.json). « __OUTILS__ » est remplacé par le
# chemin Mac des outils. run/current.txt reçoit la liste des copies à exécuter (une par ligne).
set -e
OUTILS_VM="$(cd "$(dirname "$0")/.." && pwd)"
. "$OUTILS_VM/config/chemins.env"
RUN="$OUTILS_VM/run"; mkdir -p "$RUN"
trouver() { local s="$1"; [ -f "$s" ] || s="$OUTILS_VM/$1"; [ -f "$s" ] || s="$OUTILS_VM/affinity/$1"; [ -f "$s" ] || s="$OUTILS_VM/publication/$1"; [ -f "$s" ] || { echo "script introuvable : $1" >&2; return 1; }; printf '%s' "$s"; }
# état neutre d'abord : si la préparation échoue, le lanceur n'exécute rien (pas d'ancienne liste rejouée)
: > "$RUN/current.txt"; printf '0' > "$RUN/attendu.txt"; : > "$RUN/out_run.txt"
if [ "$1" = "--suite" ]; then
  SUITE="$2"; [ -f "$SUITE" ] || SUITE="$OUTILS_VM/$2"; [ -f "$SUITE" ] || { echo "suite introuvable : $2 (ni dans le dossier courant ni dans $OUTILS_VM)" >&2; exit 1; }
  LISTE=$(python3 -c 'import json,sys; [print(s + "\t" + json.dumps(a, ensure_ascii=False)) for s, a in json.load(open(sys.argv[1]))]' "$SUITE") || { echo "suite JSON invalide : $SUITE" >&2; exit 1; }
else
  ARGS="${2:-}"; [ -n "$ARGS" ] || ARGS='{}'
  # JSON validé puis compacté sur une ligne (un JSON sur plusieurs lignes casserait la liste script<TAB>paramètres)
  ARGS=$(printf '%s' "$ARGS" | python3 -c 'import json,sys; print(json.dumps(json.load(sys.stdin), ensure_ascii=False))' 2>/dev/null) || { echo "paramètres JSON invalides : ${2:-}" >&2; exit 1; }
  LISTE="$1	$ARGS"
fi
: > "$RUN/current.txt.tmp"; k=0; noms=""
while IFS=$'\t' read -r script args; do
  [ -n "$script" ] || continue
  SRC=$(trouver "$script")
  n=$(date +%s%N | tail -c 10)$k; b=$(basename "$SRC" .js)
  sed -e "s#__OUTILS__#$OUTILS_MAC/#g" -e "s#'args.json'#'args_$n.json'#" "$OUTILS_VM/lib/affinity_lib.js" > "$RUN/lib_$n.js"
  sed -e "s#__OUTILS__lib/affinity_lib.js#$OUTILS_MAC/run/lib_$n.js#g" -e "s#__OUTILS__#$OUTILS_MAC/#g" -e "s#run/args.json#run/args_$n.json#g" "$SRC" > "$RUN/x_${b}_$n.js"
  printf '%s' "$args" > "$RUN/args_$n.json"; cp "$RUN/args_$n.json" "$RUN/args.json"
  printf '%s\n' "$OUTILS_MAC/run/x_${b}_$n.js" >> "$RUN/current.txt.tmp"
  k=$((k + 1)); noms="$noms x_${b}_$n.js"
done <<< "$LISTE"
cat "$RUN/current.txt.tmp" > "$RUN/current.txt"; : > "$RUN/current.txt.tmp"
printf '%s' "$k" > "$RUN/attendu.txt"
: > "$RUN/out_run.txt"   # vidé (pas supprimé : la suppression peut être interdite dans le dossier)
# ménage : on garde les 60 dernières copies (sans erreur si la suppression est interdite)
for motif in 'x_*.js' 'lib_*.js' 'args_*.json'; do ls -t "$RUN"/$motif 2>/dev/null | tail -n +61 | xargs -r rm -f 2>/dev/null || true; done
echo "prêt ($k script(s)) :$noms — exécuter le lanceur (MCP execute_script ou bouton Exécuter), puis bin/affinity_wait.sh"
