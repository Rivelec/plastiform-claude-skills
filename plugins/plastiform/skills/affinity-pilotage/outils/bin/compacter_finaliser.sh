#!/bin/bash
# compacter_finaliser.sh DOSSIER_VM — termine compacter.js : remplace chaque X.af par _c_X.af (version compactée).
# Contrôles : _c_X.af non vide, au moins 30 % de la taille de X.af, pas de verrou X.af~lock~ (document ouvert).
# Les originaux sont gardés dans DOSSIER/_avant_compactage/ (à supprimer après contrôle : ouvrir, rendre, comparer).
# Les documents doivent être FERMÉS dans Affinity. Les liens vers une BASE restent valables (même nom, même dossier).
set -u
D="${1:?usage : compacter_finaliser.sh DOSSIER_VM}"; cd "$D" || exit 2
n=0
for c in _c_*.af; do
  [ -e "$c" ] || { echo "aucun fichier _c_*.af dans $D"; exit 0; }
  o="${c#_c_}"
  [ -f "$o" ] || { echo "$c : original $o introuvable, ignoré"; continue; }
  [ -e "$o~lock~" ] && { echo "$o : verrou présent (document ouvert ?), ignoré"; continue; }
  so=$(stat -c %s "$o" 2>/dev/null || stat -f %z "$o"); sc=$(stat -c %s "$c" 2>/dev/null || stat -f %z "$c")
  if [ "$sc" -le 0 ] || [ $((sc * 100 / so)) -lt 30 ]; then echo "$c : taille suspecte ($sc octets pour $so), ignoré"; continue; fi
  mkdir -p _avant_compactage && mv "$o" "_avant_compactage/$o" && mv "$c" "$o" && n=$((n + 1))
  echo "$o : $((so / 1048576)) Mo → $((sc / 1048576)) Mo"
done
echo "$n fichier(s) remplacé(s) ; originaux dans $D/_avant_compactage/ (à supprimer après contrôle)."
