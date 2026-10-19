#!/bin/bash
# affinity_wait.sh [secondes=110] — attend la fin des scripts lancés dans Affinity (autant de lignes « FIN » dans
# run/out_run.txt que de scripts préparés, run/attendu.txt) puis affiche le compte rendu. Code de sortie 2 si tout
# n'est pas terminé dans le délai : script encore en cours (relancer affinity_wait.sh), lanceur pas exécuté, ou
# Affinity bloqué par une boîte de dialogue (faire une capture d'écran). Le shell du Mac (device_bash) coupe une
# commande à 120 s par défaut : au-delà de 110 s, passer timeout_ms (max 180000) — ex. 170 s avec timeout_ms 180000.
OUTILS_VM="$(cd "$(dirname "$0")/.." && pwd)"
F="$OUTILS_VM/run/out_run.txt"; T=${1:-110}; N=$(cat "$OUTILS_VM/run/attendu.txt" 2>/dev/null || echo 1); [ -n "$N" ] || N=1
fins() { local c; c=$(grep -cx 'FIN' "$F" 2>/dev/null); echo "${c:-0}"; }
for ((i = 0; i < T; i += 2)); do [ "$(fins)" -ge "$N" ] && break; sleep 2; done
if [ "$(fins)" -ge "$N" ]; then cat "$F"; exit 0; fi
echo "($(fins)/$N script(s) terminé(s) après ${T} s)"; [ -f "$F" ] && cat "$F"; exit 2
